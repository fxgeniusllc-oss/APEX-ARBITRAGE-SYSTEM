// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IBalancerVault {
    function flashLoan(
        address recipient,
        address[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external;
}

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        returns (uint256 amountOut);
}

/**
 * @title ApexFlashArbitrage
 * @notice Production-ready flash loan arbitrage contract
 * @dev Supports multi-DEX arbitrage with Balancer flash loans
 */
contract ApexFlashArbitrage is Ownable, ReentrancyGuard {
    
    // Balancer Vault address (Polygon)
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
    
    // DEX Router addresses
    mapping(string => address) public dexRouters;
    
    // Safety parameters
    uint256 public minProfitBps = 10; // 0.1% minimum profit
    uint256 public maxGasPrice = 100 gwei;
    uint256 public maxSlippageBps = 50; // 0.5%
    
    // Statistics
    uint256 public totalExecutions;
    uint256 public totalProfit;
    uint256 public lastExecutionTimestamp;
    
    // Events
    event ArbitrageExecuted(
        address indexed token,
        uint256 amount,
        uint256 profit,
        uint256 timestamp
    );
    
    event ProfitWithdrawn(
        address indexed token,
        address indexed recipient,
        uint256 amount
    );
    
    event ParametersUpdated(
        uint256 minProfitBps,
        uint256 maxGasPrice,
        uint256 maxSlippageBps
    );
    
    constructor() Ownable(msg.sender) {
        // Initialize DEX routers (Polygon addresses)
        dexRouters["quickswap"] = 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff;
        dexRouters["sushiswap"] = 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506;
        dexRouters["uniswap_v3"] = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    }
    
    /**
     * @notice Execute multi-hop arbitrage with flash loan
     * @param tokens Array of token addresses in the route
     * @param dexes Array of DEX identifiers
     * @param amounts Array of swap amounts
     * @param minProfit Minimum acceptable profit
     */
    function executeArbitrage(
        address[] memory tokens,
        string[] memory dexes,
        uint256[] memory amounts,
        uint256 minProfit
    ) external onlyOwner nonReentrant {
        require(tx.gasprice <= maxGasPrice, "Gas price too high");
        require(tokens.length >= 3, "Invalid route");
        require(tokens.length == dexes.length + 1, "Invalid route structure");
        
        // Prepare flash loan
        address[] memory flashTokens = new address[](1);
        flashTokens[0] = tokens[0];
        
        uint256[] memory flashAmounts = new uint256[](1);
        flashAmounts[0] = amounts[0];
        
        // Encode route data
        bytes memory userData = abi.encode(
            tokens,
            dexes,
            amounts,
            minProfit
        );
        
        // Execute flash loan
        IBalancerVault(BALANCER_VAULT).flashLoan(
            address(this),
            flashTokens,
            flashAmounts,
            userData
        );
        
        lastExecutionTimestamp = block.timestamp;
        totalExecutions++;
    }
    
    /**
     * @notice Balancer flash loan callback
     * @dev This is called by Balancer Vault during flash loan
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Only Balancer Vault");
        
        // Decode route data
        (
            address[] memory routeTokens,
            string[] memory routeDexes,
            uint256[] memory routeAmounts,
            uint256 minProfit
        ) = abi.decode(userData, (address[], string[], uint256[], uint256));
        
        uint256 initialBalance = amounts[0];
        uint256 currentAmount = initialBalance;
        
        // Execute multi-hop swaps
        for (uint256 i = 0; i < routeDexes.length; i++) {
            currentAmount = _executeSwap(
                routeTokens[i],
                routeTokens[i + 1],
                currentAmount,
                routeDexes[i]
            );
        }
        
        // Calculate profit
        uint256 finalBalance = IERC20(tokens[0]).balanceOf(address(this));
        require(finalBalance > initialBalance, "No profit");
        
        uint256 profit = finalBalance - initialBalance;
        uint256 requiredMinProfit = (initialBalance * minProfitBps) / 10000;
        require(profit >= requiredMinProfit, "Profit too low");
        require(profit >= minProfit, "Below minimum profit");
        
        // Repay flash loan (Balancer has 0 fee)
        IERC20(tokens[0]).transfer(BALANCER_VAULT, amounts[0]);
        
        // Update statistics
        totalProfit += profit;
        
        emit ArbitrageExecuted(tokens[0], amounts[0], profit, block.timestamp);
    }
    
    /**
     * @notice Execute single swap on specified DEX
     */
    function _executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        string memory dex
    ) internal returns (uint256) {
        address router = dexRouters[dex];
        require(router != address(0), "Invalid DEX");
        
        // Approve token
        IERC20(tokenIn).approve(router, amountIn);
        
        // Calculate minimum output with slippage
        uint256 amountOutMin = (amountIn * (10000 - maxSlippageBps)) / 10000;
        
        // Execute swap based on DEX type
        if (keccak256(bytes(dex)) == keccak256(bytes("uniswap_v3"))) {
            return _swapV3(tokenIn, tokenOut, amountIn, amountOutMin, router);
        } else {
            return _swapV2(tokenIn, tokenOut, amountIn, amountOutMin, router);
        }
    }
    
    /**
     * @notice Execute Uniswap V2 style swap
     */
    function _swapV2(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address router
    ) internal returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = IUniswapV2Router(router).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            block.timestamp
        );
        
        return amounts[amounts.length - 1];
    }
    
    /**
     * @notice Execute Uniswap V3 swap
     */
    function _swapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address router,
        uint24 fee
    ) internal returns (uint256) {
        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMin,
                sqrtPriceLimitX96: 0
            });
        
        return IUniswapV3Router(router).exactInputSingle(params);
    }
    
    /**
     * @notice Update safety parameters
     */
    function updateParameters(
        uint256 _minProfitBps,
        uint256 _maxGasPrice,
        uint256 _maxSlippageBps
    ) external onlyOwner {
        minProfitBps = _minProfitBps;
        maxGasPrice = _maxGasPrice;
        maxSlippageBps = _maxSlippageBps;
        
        emit ParametersUpdated(_minProfitBps, _maxGasPrice, _maxSlippageBps);
    }
    
    /**
     * @notice Add or update DEX router
     */
    function updateDexRouter(string memory dex, address router) external onlyOwner {
        dexRouters[dex] = router;
    }
    
    /**
     * @notice Withdraw profits
     */
    function withdrawProfits(
        address token,
        address recipient
    ) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        
        IERC20(token).transfer(recipient, balance);
        
        emit ProfitWithdrawn(token, recipient, balance);
    }
    
    /**
     * @notice Emergency withdraw
     */
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner(), balance);
        }
    }
    
    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 executions,
        uint256 profit,
        uint256 lastExecution
    ) {
        return (totalExecutions, totalProfit, lastExecutionTimestamp);
    }
}
