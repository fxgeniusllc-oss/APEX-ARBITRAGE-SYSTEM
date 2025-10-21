import { ethers } from 'hardhat';

/**
 * Deploy APEX Flash Arbitrage Contract
 */
async function main() {
    console.log('🚀 Deploying APEX Flash Arbitrage Contract...\n');

    const [deployer] = await ethers.getSigners();
    console.log('Deploying with account:', deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log('Account balance:', ethers.formatEther(balance), 'ETH\n');

    // Deploy contract
    console.log('Deploying ApexFlashArbitrage...');
    const ApexFlashArbitrage = await ethers.getContractFactory('ApexFlashArbitrage');
    const contract = await ApexFlashArbitrage.deploy();
    
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    console.log('✅ ApexFlashArbitrage deployed to:', contractAddress);
    console.log();

    // Display configuration
    console.log('📋 Contract Configuration:');
    console.log('  Min Profit BPS:', await contract.minProfitBps());
    console.log('  Max Gas Price:', ethers.formatUnits(await contract.maxGasPrice(), 'gwei'), 'Gwei');
    console.log('  Max Slippage BPS:', await contract.maxSlippageBps());
    console.log();

    // Get DEX routers
    console.log('🔗 Configured DEX Routers:');
    const dexes = ['quickswap', 'sushiswap', 'uniswap_v3'];
    for (const dex of dexes) {
        const router = await contract.dexRouters(dex);
        console.log(`  ${dex}:`, router);
    }
    console.log();

    // Save deployment info
    const deploymentInfo = {
        network: (await ethers.provider.getNetwork()).name,
        chainId: (await ethers.provider.getNetwork()).chainId.toString(),
        contract: contractAddress,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        blockNumber: await ethers.provider.getBlockNumber()
    };

    console.log('💾 Deployment Info:');
    console.log(JSON.stringify(deploymentInfo, null, 2));
    console.log();

    // Instructions
    console.log('📝 Next Steps:');
    console.log('1. Update .env file with contract address:');
    console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
    console.log();
    console.log('2. Fund the contract with gas tokens (MATIC for Polygon)');
    console.log();
    console.log('3. Start the arbitrage system:');
    console.log('   yarn start');
    console.log();
    console.log('4. Verify contract on block explorer (optional):');
    console.log(`   yarn hardhat verify --network polygon ${contractAddress}`);
    console.log();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
