/**
 * Uniswap V2/V3 Adapter
 * Provides unified interface for interacting with Uniswap protocols
 */

const { ethers } = require('ethers');
const chalk = require('chalk');

/**
 * Uniswap V2 Router ABI
 */
const UNISWAP_V2_ROUTER_ABI = [
    'function factory() external pure returns (address)',
    'function WETH() external pure returns (address)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB)',
    'function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure returns (uint amountOut)',
    'function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure returns (uint amountIn)',
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
    'function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts)',
    'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
    'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)',
    'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)',
    'function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountToken, uint amountETH)'
];

/**
 * Uniswap V3 Router ABI
 */
const UNISWAP_V3_ROUTER_ABI = [
    'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
    'function exactInput(tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)',
    'function exactOutputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountIn)',
    'function exactOutput(tuple(bytes path, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum) params) external payable returns (uint256 amountIn)'
];

/**
 * Uniswap V3 Quoter ABI
 */
const UNISWAP_V3_QUOTER_ABI = [
    'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
    'function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut)',
    'function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) external returns (uint256 amountIn)',
    'function quoteExactOutput(bytes memory path, uint256 amountOut) external returns (uint256 amountIn)'
];

class UniswapAdapter {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
        this.version = config.type === 'uniswap-v3' ? 'v3' : 'v2';
        
        if (this.version === 'v2') {
            this.router = new ethers.Contract(config.router, UNISWAP_V2_ROUTER_ABI, provider);
        } else {
            this.router = new ethers.Contract(config.router, UNISWAP_V3_ROUTER_ABI, provider);
            this.quoter = new ethers.Contract(config.quoter, UNISWAP_V3_QUOTER_ABI, provider);
        }
    }

    /**
     * Get quote for swap (V2)
     */
    async getAmountsOut(amountIn, path) {
        if (this.version !== 'v2') {
            throw new Error('getAmountsOut is only available for Uniswap V2');
        }
        
        try {
            return await this.router.getAmountsOut(amountIn, path);
        } catch (error) {
            console.log(chalk.red(`Error getting amounts out: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get quote for swap (V3)
     */
    async quoteExactInputSingle(tokenIn, tokenOut, fee, amountIn) {
        if (this.version !== 'v3') {
            throw new Error('quoteExactInputSingle is only available for Uniswap V3');
        }
        
        try {
            return await this.quoter.callStatic.quoteExactInputSingle(
                tokenIn,
                tokenOut,
                fee,
                amountIn,
                0
            );
        } catch (error) {
            console.log(chalk.red(`Error getting V3 quote: ${error.message}`));
            throw error;
        }
    }

    /**
     * Execute swap (V2)
     */
    async swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline, signer) {
        if (this.version !== 'v2') {
            throw new Error('swapExactTokensForTokens is only available for Uniswap V2');
        }
        
        try {
            const routerWithSigner = this.router.connect(signer);
            const tx = await routerWithSigner.swapExactTokensForTokens(
                amountIn,
                amountOutMin,
                path,
                to,
                deadline
            );
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`Error executing V2 swap: ${error.message}`));
            throw error;
        }
    }

    /**
     * Execute swap (V3)
     */
    async exactInputSingle(params, signer) {
        if (this.version !== 'v3') {
            throw new Error('exactInputSingle is only available for Uniswap V3');
        }
        
        try {
            const routerWithSigner = this.router.connect(signer);
            const tx = await routerWithSigner.exactInputSingle(params);
            return await tx.wait();
        } catch (error) {
            console.log(chalk.red(`Error executing V3 swap: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get factory address
     */
    async getFactory() {
        if (this.version === 'v2') {
            return await this.router.factory();
        }
        return this.config.factory;
    }

    /**
     * Get WETH address
     */
    async getWETH() {
        if (this.version === 'v2') {
            return await this.router.WETH();
        }
        // V3 doesn't have WETH in router, use config
        return this.config.weth || null;
    }
}

module.exports = {
    UniswapAdapter,
    UNISWAP_V2_ROUTER_ABI,
    UNISWAP_V3_ROUTER_ABI,
    UNISWAP_V3_QUOTER_ABI
};
