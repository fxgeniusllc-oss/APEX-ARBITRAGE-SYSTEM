/**
 * APEX Dynamic DEX Pool Fetcher
 * Fetches and caches pool data from multiple DEXs across chains
 * Supports Uniswap V2/V3, SushiSwap, QuickSwap, Balancer, Curve, and more
 */

import { ethers } from 'ethers';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { loadPoolsFromSDK } from './sdk_pool_loader.js';

// ES module equivalents of __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

/**
 * DEX configurations for supported protocols
 */
const DEX_CONFIGS = {
    polygon: {
        quickswap: {
            factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
            router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
            type: 'uniswap-v2'
        },
        sushiswap: {
            factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
            router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
            type: 'uniswap-v2'
        },
        uniswapv3: {
            factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
            type: 'uniswap-v3'
        },
        balancer: {
            vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
            type: 'balancer-v2'
        },
        curve: {
            registry: '0x094d12e5b541784701FD8d65F11fc0598FBC6332',
            type: 'curve'
        }
    },
    ethereum: {
        uniswapv2: {
            factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
            router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            type: 'uniswap-v2'
        },
        uniswapv3: {
            factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
            type: 'uniswap-v3'
        },
        sushiswap: {
            factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
            router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
            type: 'uniswap-v2'
        },
        balancer: {
            vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
            type: 'balancer-v2'
        }
    },
    arbitrum: {
        uniswapv3: {
            factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
            type: 'uniswap-v3'
        },
        sushiswap: {
            factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
            router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
            type: 'uniswap-v2'
        },
        balancer: {
            vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
            type: 'balancer-v2'
        }
    }
};

/**
 * Uniswap V2 Factory ABI (comprehensive)
 */
const UNISWAP_V2_FACTORY_ABI = [
    'function allPairsLength() external view returns (uint)',
    'function allPairs(uint) external view returns (address)',
    'function getPair(address tokenA, address tokenB) external view returns (address pair)',
    'function createPair(address tokenA, address tokenB) external returns (address pair)',
    'function feeTo() external view returns (address)',
    'function feeToSetter() external view returns (address)',
    'function setFeeTo(address) external',
    'function setFeeToSetter(address) external',
    'event PairCreated(address indexed token0, address indexed token1, address pair, uint)'
];

/**
 * Uniswap V2 Pair ABI (comprehensive)
 */
const UNISWAP_V2_PAIR_ABI = [
    'function name() external pure returns (string)',
    'function symbol() external pure returns (string)',
    'function decimals() external pure returns (uint8)',
    'function totalSupply() external view returns (uint)',
    'function balanceOf(address owner) external view returns (uint)',
    'function allowance(address owner, address spender) external view returns (uint)',
    'function approve(address spender, uint value) external returns (bool)',
    'function transfer(address to, uint value) external returns (bool)',
    'function transferFrom(address from, address to, uint value) external returns (bool)',
    'function DOMAIN_SEPARATOR() external view returns (bytes32)',
    'function PERMIT_TYPEHASH() external pure returns (bytes32)',
    'function nonces(address owner) external view returns (uint)',
    'function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external',
    'function MINIMUM_LIQUIDITY() external pure returns (uint)',
    'function factory() external view returns (address)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function price0CumulativeLast() external view returns (uint)',
    'function price1CumulativeLast() external view returns (uint)',
    'function kLast() external view returns (uint)',
    'function mint(address to) external returns (uint liquidity)',
    'function burn(address to) external returns (uint amount0, uint amount1)',
    'function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external',
    'function skim(address to) external',
    'function sync() external',
    'function initialize(address, address) external',
    'event Mint(address indexed sender, uint amount0, uint amount1)',
    'event Burn(address indexed sender, uint amount0, uint amount1, address indexed to)',
    'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)',
    'event Sync(uint112 reserve0, uint112 reserve1)'
];

/**
 * Uniswap V2 Router ABI (comprehensive)
 */
const UNISWAP_V2_ROUTER_ABI = [
    'function factory() external pure returns (address)',
    'function WETH() external pure returns (address)',
    'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
    'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)',
    'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)',
    'function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountToken, uint amountETH)',
    'function removeLiquidityWithPermit(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s) external returns (uint amountA, uint amountB)',
    'function removeLiquidityETHWithPermit(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s) external returns (uint amountToken, uint amountETH)',
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
    'function removeLiquidityETHSupportingFeeOnTransferTokens(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountETH)',
    'function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s) external returns (uint amountETH)',
    'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external',
    'function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable',
    'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external'
];

/**
 * Balancer Vault ABI (comprehensive)
 */
const BALANCER_VAULT_ABI = [
    'function getPoolTokens(bytes32 poolId) external view returns (address[] tokens, uint256[] balances, uint256 lastChangeBlock)',
    'function getPool(bytes32 poolId) external view returns (address, uint8)',
    'function registerPool(uint8 specialization) external returns (bytes32)',
    'function registerTokens(bytes32 poolId, address[] tokens, address[] assetManagers) external',
    'function deregisterTokens(bytes32 poolId, address[] tokens) external',
    'function joinPool(bytes32 poolId, address sender, address recipient, tuple(address[] assets, uint256[] maxAmountsIn, bytes userData, bool fromInternalBalance) request) external payable',
    'function exitPool(bytes32 poolId, address sender, address recipient, tuple(address[] assets, uint256[] minAmountsOut, bytes userData, bool toInternalBalance) request) external',
    'function swap(tuple(bytes32 poolId, uint8 kind, address assetIn, address assetOut, uint256 amount, bytes userData) singleSwap, tuple(address sender, bool fromInternalBalance, address recipient, bool toInternalBalance) funds, uint256 limit, uint256 deadline) external payable returns (uint256)',
    'function batchSwap(uint8 kind, tuple(bytes32 poolId, uint256 assetInIndex, uint256 assetOutIndex, uint256 amount, bytes userData)[] swaps, address[] assets, tuple(address sender, bool fromInternalBalance, address recipient, bool toInternalBalance) funds, int256[] limits, uint256 deadline) external payable returns (int256[] assetDeltas)',
    'function queryBatchSwap(uint8 kind, tuple(bytes32 poolId, uint256 assetInIndex, uint256 assetOutIndex, uint256 amount, bytes userData)[] swaps, address[] assets, tuple(address sender, bool fromInternalBalance, address recipient, bool toInternalBalance) funds) external returns (int256[])',
    'function flashLoan(address recipient, address[] tokens, uint256[] amounts, bytes userData) external',
    'function manageUserBalance(tuple(uint8 kind, address asset, uint256 amount, address sender, address recipient)[] ops) external payable',
    'function getInternalBalance(address user, address[] tokens) external view returns (uint256[] balances)',
    'function setPaused(bool paused) external',
    'function WETH() external view returns (address)',
    'function getAuthorizer() external view returns (address)',
    'function setAuthorizer(address newAuthorizer) external',
    'function hasApprovedRelayer(address user, address relayer) external view returns (bool)',
    'function setRelayerApproval(address sender, address relayer, bool approved) external',
    'function getProtocolFeesCollector() external view returns (address)',
    'event Swap(bytes32 indexed poolId, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)',
    'event PoolBalanceChanged(bytes32 indexed poolId, address indexed liquidityProvider, address[] tokens, int256[] deltas, uint256[] protocolFeeAmounts)',
    'event PoolBalanceManaged(bytes32 indexed poolId, address indexed assetManager, address indexed token, int256 cashDelta, int256 managedDelta)',
    'event FlashLoan(address indexed recipient, address indexed token, uint256 amount, uint256 feeAmount)'
];

/**
 * Curve Registry ABI (comprehensive)
 */
const CURVE_REGISTRY_ABI = [
    'function pool_count() external view returns (uint256)',
    'function pool_list(uint256) external view returns (address)',
    'function get_pool_from_lp_token(address) external view returns (address)',
    'function get_lp_token(address) external view returns (address)',
    'function get_n_coins(address) external view returns (uint256[2])',
    'function get_coins(address) external view returns (address[8])',
    'function get_underlying_coins(address) external view returns (address[8])',
    'function get_decimals(address) external view returns (uint256[8])',
    'function get_underlying_decimals(address) external view returns (uint256[8])',
    'function get_rates(address) external view returns (uint256[8])',
    'function get_gauges(address) external view returns (address[10], int128[10])',
    'function get_balances(address) external view returns (uint256[8])',
    'function get_underlying_balances(address) external view returns (uint256[8])',
    'function get_virtual_price_from_lp_token(address) external view returns (uint256)',
    'function get_A(address) external view returns (uint256)',
    'function get_fees(address) external view returns (uint256[2])',
    'function get_admin_balances(address) external view returns (uint256[8])',
    'function get_coin_indices(address pool, address from, address to) external view returns (int128, int128, bool)'
];

/**
 * Curve Pool ABI (comprehensive)
 */
const CURVE_POOL_ABI = [
    'function coins(uint256) external view returns (address)',
    'function underlying_coins(uint256) external view returns (address)',
    'function balances(uint256) external view returns (uint256)',
    'function get_virtual_price() external view returns (uint256)',
    'function calc_token_amount(uint256[] amounts, bool is_deposit) external view returns (uint256)',
    'function add_liquidity(uint256[] amounts, uint256 min_mint_amount) external',
    'function remove_liquidity(uint256 _amount, uint256[] min_amounts) external',
    'function remove_liquidity_imbalance(uint256[] amounts, uint256 max_burn_amount) external',
    'function calc_withdraw_one_coin(uint256 _token_amount, int128 i) external view returns (uint256)',
    'function remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_amount) external',
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external',
    'function exchange_underlying(int128 i, int128 j, uint256 dx, uint256 min_dy) external',
    'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
    'function get_dy_underlying(int128 i, int128 j, uint256 dx) external view returns (uint256)',
    'function A() external view returns (uint256)',
    'function A_precise() external view returns (uint256)',
    'function fee() external view returns (uint256)',
    'function admin_fee() external view returns (uint256)',
    'function admin_balances(uint256) external view returns (uint256)',
    'function owner() external view returns (address)',
    'function lp_token() external view returns (address)',
    'event TokenExchange(address indexed buyer, int128 sold_id, uint256 tokens_sold, int128 bought_id, uint256 tokens_bought)',
    'event TokenExchangeUnderlying(address indexed buyer, int128 sold_id, uint256 tokens_sold, int128 bought_id, uint256 tokens_bought)',
    'event AddLiquidity(address indexed provider, uint256[] token_amounts, uint256[] fees, uint256 invariant, uint256 token_supply)',
    'event RemoveLiquidity(address indexed provider, uint256[] token_amounts, uint256[] fees, uint256 token_supply)',
    'event RemoveLiquidityOne(address indexed provider, uint256 token_amount, uint256 coin_amount)',
    'event RemoveLiquidityImbalance(address indexed provider, uint256[] token_amounts, uint256[] fees, uint256 invariant, uint256 token_supply)'
];

/**
 * ERC20 Token ABI (comprehensive)
 */
const ERC20_ABI = [
    'function name() external view returns (string)',
    'function symbol() external view returns (string)',
    'function decimals() external view returns (uint8)',
    'function totalSupply() external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)',
    'function transfer(address recipient, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)',
    'function increaseAllowance(address spender, uint256 addedValue) external returns (bool)',
    'function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

class DexPoolFetcher {
    constructor() {
        this.providers = {};
        this.poolCache = new Map();
        this.lastUpdate = new Map();
        this.cacheExpiry = 300000; // 5 minutes
        this.isRunning = false;
        this.stats = {
            totalPools: 0,
            lastFetchTime: 0,
            fetchCount: 0,
            errors: 0
        };
    }

    /**
     * Initialize providers for all configured chains
     */
    async initialize() {
        console.log(chalk.cyan('🔗 Initializing DEX Pool Fetcher...'));

        // Initialize providers for each chain
        const chains = ['polygon', 'ethereum', 'arbitrum'];
        
        for (const chain of chains) {
            const rpcVar = `${chain.toUpperCase()}_RPC_URL`;
            const rpcUrl = process.env[rpcVar];
            
            if (!rpcUrl) {
                console.log(chalk.yellow(`⚠️  ${chain}: No RPC URL found, skipping`));
                continue;
            }

            try {
                this.providers[chain] = new ethers.JsonRpcProvider(rpcUrl);
                const network = await this.providers[chain].getNetwork();
                console.log(chalk.green(`✅ ${chain}: Connected (Chain ID: ${network.chainId})`));
            } catch (error) {
                console.log(chalk.red(`❌ ${chain}: Connection failed - ${error.message}`));
            }
        }

        console.log(chalk.green('✅ DEX Pool Fetcher initialized'));
    }

    /**
     * Fetch pools from Uniswap V2-style DEXs
     */
    async fetchUniswapV2Pools(chain, dexName, config, limit = 100) {
        const provider = this.providers[chain];
        if (!provider) {
            console.log(chalk.yellow(`⚠️  No provider for ${chain}`));
            return [];
        }

        try {
            const factory = new ethers.Contract(config.factory, UNISWAP_V2_FACTORY_ABI, provider);
            const pairCount = await factory.allPairsLength();
            const totalPairs = Number(pairCount);

            console.log(chalk.cyan(`📊 ${dexName} on ${chain}: ${totalPairs} pairs found`));

            const pools = [];
            const batchSize = Math.min(limit, 50);
            
            // Fetch most recent pairs (they tend to have better liquidity)
            const startIndex = Math.max(0, totalPairs - limit);
            
            for (let i = startIndex; i < Math.min(startIndex + limit, totalPairs); i += batchSize) {
                const batch = [];
                const end = Math.min(i + batchSize, Math.min(startIndex + limit, totalPairs));
                
                for (let j = i; j < end; j++) {
                    batch.push(factory.allPairs(j));
                }

                const pairAddresses = await Promise.all(batch);
                
                for (const pairAddress of pairAddresses) {
                    const pair = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, provider);
                    
                    try {
                        const [token0, token1, reserves] = await Promise.all([
                            pair.token0(),
                            pair.token1(),
                            pair.getReserves()
                        ]);

                        pools.push({
                            address: pairAddress,
                            token0,
                            token1,
                            reserve0: reserves[0].toString(),
                            reserve1: reserves[1].toString(),
                            dex: dexName,
                            chain,
                            type: 'uniswap-v2',
                            timestamp: Date.now()
                        });
                    } catch (error) {
                        // Skip invalid pairs
                        continue;
                    }
                }
            }

            return pools;
        } catch (error) {
            console.log(chalk.red(`❌ Error fetching ${dexName} pools: ${error.message}`));
            this.stats.errors++;
            return [];
        }
    }

    /**
     * Fetch pools from all configured DEXs
     */
    async fetchAllPools() {
        console.log(chalk.cyan('🔄 Fetching pools from all DEXs...'));
        const startTime = Date.now();

        const allPools = [];

        for (const [chain, dexes] of Object.entries(DEX_CONFIGS)) {
            if (!this.providers[chain]) {
                continue;
            }

            for (const [dexName, config] of Object.entries(dexes)) {
                console.log(chalk.blue(`📡 Fetching ${dexName} pools on ${chain}...`));

                try {
                    let pools = [];

                    if (config.type === 'uniswap-v2') {
                        pools = await this.fetchUniswapV2Pools(chain, dexName, config, 100);
                    } else if (config.type === 'uniswap-v3') {
                        // Use SDK loader for Uniswap V3
                        console.log(chalk.blue(`🔧 Using SDK loader for ${dexName}`));
                        try {
                            pools = await loadPoolsFromSDK(chain, dexName, config);
                        } catch (error) {
                            console.log(chalk.yellow(`⚠️  SDK loader failed, skipping ${dexName}`));
                        }
                    } else if (config.type === 'balancer-v2') {
                        console.log(chalk.blue(`🔧 Balancer pools require specialized fetcher`));
                        // Balancer pools handled by Python fetcher
                    }

                    if (pools.length > 0) {
                        allPools.push(...pools);
                        const cacheKey = `${chain}:${dexName}`;
                        this.poolCache.set(cacheKey, pools);
                        this.lastUpdate.set(cacheKey, Date.now());
                        console.log(chalk.green(`✅ Cached ${pools.length} ${dexName} pools`));
                    }
                } catch (error) {
                    console.log(chalk.red(`❌ Error fetching ${dexName}: ${error.message}`));
                    this.stats.errors++;
                }
            }
        }

        const fetchTime = Date.now() - startTime;
        this.stats.totalPools = allPools.length;
        this.stats.lastFetchTime = fetchTime;
        this.stats.fetchCount++;

        console.log(chalk.green(`✅ Fetched ${allPools.length} pools in ${fetchTime}ms`));

        // Save to file for Python integration
        await this.savePools(allPools);

        return allPools;
    }

    /**
     * Get cached pools for a specific DEX/chain
     */
    getCachedPools(chain, dex) {
        const cacheKey = `${chain}:${dex}`;
        const pools = this.poolCache.get(cacheKey);
        const lastUpdate = this.lastUpdate.get(cacheKey);

        if (!pools || !lastUpdate) {
            return null;
        }

        // Check if cache is expired
        if (Date.now() - lastUpdate > this.cacheExpiry) {
            return null;
        }

        return pools;
    }

    /**
     * Save pools to JSON file for Python integration
     */
    async savePools(pools) {
        try {
            const dataDir = path.join(__dirname, '../data');
            await fs.mkdir(dataDir, { recursive: true });

            const filePath = path.join(dataDir, 'dex_pools.json');
            await fs.writeFile(filePath, JSON.stringify({
                pools,
                timestamp: Date.now(),
                stats: this.stats
            }, null, 2));

            console.log(chalk.green(`💾 Saved ${pools.length} pools to ${filePath}`));
        } catch (error) {
            console.log(chalk.red(`❌ Error saving pools: ${error.message}`));
        }
    }

    /**
     * Display statistics
     */
    displayStats() {
        console.log(chalk.cyan('\n📊 DEX Pool Fetcher Statistics:'));
        console.log(chalk.white(`   Total Pools: ${chalk.green(this.stats.totalPools)}`));
        console.log(chalk.white(`   Fetch Count: ${chalk.green(this.stats.fetchCount)}`));
        console.log(chalk.white(`   Last Fetch Time: ${chalk.green(this.stats.lastFetchTime)}ms`));
        console.log(chalk.white(`   Errors: ${chalk.red(this.stats.errors)}`));
        console.log(chalk.white(`   Cache Size: ${chalk.green(this.poolCache.size)} entries`));
    }

    /**
     * Start continuous pool fetching
     */
    async start() {
        console.log(chalk.bold.green('🚀 Starting DEX Pool Fetcher...'));
        
        await this.initialize();
        this.isRunning = true;

        const updateInterval = parseInt(process.env.POOL_UPDATE_INTERVAL) || 300000; // 5 minutes default

        while (this.isRunning) {
            try {
                await this.fetchAllPools();
                this.displayStats();
                
                console.log(chalk.cyan(`⏳ Waiting ${updateInterval / 1000}s before next update...`));
                await new Promise(resolve => setTimeout(resolve, updateInterval));
            } catch (error) {
                console.log(chalk.red(`❌ Error in main loop: ${error.message}`));
                this.stats.errors++;
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
    }

    /**
     * Stop the fetcher
     */
    stop() {
        console.log(chalk.yellow('🛑 Stopping DEX Pool Fetcher...'));
        this.isRunning = false;
    }
}

// Run if executed directly (ES module compatible check)
if (import.meta.url === `file://${process.argv[1]}`) {
    const fetcher = new DexPoolFetcher();
    
    // Handle shutdown signals
    process.on('SIGINT', () => {
        fetcher.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        fetcher.stop();
        process.exit(0);
    });

    fetcher.start().catch(error => {
        console.error(chalk.red('Fatal error:'), error);
        process.exit(1);
    });
}

export { DexPoolFetcher };
