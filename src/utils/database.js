import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

/**
 * Database utility for storing execution history and metrics
 */

const DB_PATH = process.env.DB_PATH || 'data/apex.db';

// Ensure data directory exists
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

/**
 * Initialize database tables
 */
export function initializeDatabase() {
    // Executions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS executions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            route_id TEXT NOT NULL,
            chain TEXT NOT NULL,
            tokens TEXT NOT NULL,
            dexes TEXT NOT NULL,
            input_amount REAL NOT NULL,
            output_amount REAL NOT NULL,
            profit_usd REAL NOT NULL,
            gas_used INTEGER,
            gas_price_gwei REAL,
            tx_hash TEXT,
            status TEXT NOT NULL,
            error_message TEXT,
            execution_time_ms INTEGER,
            ml_confidence REAL
        )
    `);

    // Create index on timestamp for faster queries
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_executions_timestamp 
        ON executions(timestamp DESC)
    `);

    // Create index on status
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_executions_status 
        ON executions(status)
    `);

    // Daily stats table
    db.exec(`
        CREATE TABLE IF NOT EXISTS daily_stats (
            date TEXT PRIMARY KEY,
            total_executions INTEGER DEFAULT 0,
            successful_executions INTEGER DEFAULT 0,
            failed_executions INTEGER DEFAULT 0,
            total_profit REAL DEFAULT 0,
            total_loss REAL DEFAULT 0,
            net_profit REAL DEFAULT 0,
            avg_profit_per_trade REAL DEFAULT 0,
            best_trade_profit REAL DEFAULT 0,
            worst_trade_loss REAL DEFAULT 0,
            total_gas_spent REAL DEFAULT 0
        )
    `);

    // Route performance table
    db.exec(`
        CREATE TABLE IF NOT EXISTS route_performance (
            route_id TEXT PRIMARY KEY,
            total_attempts INTEGER DEFAULT 0,
            successful_attempts INTEGER DEFAULT 0,
            failed_attempts INTEGER DEFAULT 0,
            success_rate REAL DEFAULT 0,
            total_profit REAL DEFAULT 0,
            avg_profit REAL DEFAULT 0,
            best_profit REAL DEFAULT 0,
            last_execution INTEGER
        )
    `);

    console.log('✅ Database initialized');
}

/**
 * Log an arbitrage execution
 */
export function logExecution(execution) {
    const stmt = db.prepare(`
        INSERT INTO executions (
            timestamp, route_id, chain, tokens, dexes, 
            input_amount, output_amount, profit_usd, 
            gas_used, gas_price_gwei, tx_hash, status, 
            error_message, execution_time_ms, ml_confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        execution.timestamp || Date.now(),
        execution.routeId,
        execution.chain,
        JSON.stringify(execution.tokens),
        JSON.stringify(execution.dexes),
        execution.inputAmount,
        execution.outputAmount || 0,
        execution.profitUsd || 0,
        execution.gasUsed || 0,
        execution.gasPriceGwei || 0,
        execution.txHash || null,
        execution.status,
        execution.errorMessage || null,
        execution.executionTimeMs || 0,
        execution.mlConfidence || 0
    );

    // Update route performance
    updateRoutePerformance(execution);

    // Update daily stats
    updateDailyStats(execution);
}

/**
 * Update route performance statistics
 */
function updateRoutePerformance(execution) {
    const route = db.prepare(`
        SELECT * FROM route_performance WHERE route_id = ?
    `).get(execution.routeId);

    if (route) {
        // Update existing route
        const stmt = db.prepare(`
            UPDATE route_performance SET
                total_attempts = total_attempts + 1,
                successful_attempts = successful_attempts + ?,
                failed_attempts = failed_attempts + ?,
                success_rate = CAST(successful_attempts + ? AS REAL) / (total_attempts + 1),
                total_profit = total_profit + ?,
                avg_profit = (total_profit + ?) / (successful_attempts + ?),
                best_profit = MAX(best_profit, ?),
                last_execution = ?
            WHERE route_id = ?
        `);

        const isSuccess = execution.status === 'success' ? 1 : 0;
        stmt.run(
            isSuccess,
            1 - isSuccess,
            isSuccess,
            execution.profitUsd || 0,
            execution.profitUsd || 0,
            isSuccess || 1,
            execution.profitUsd || 0,
            execution.timestamp || Date.now(),
            execution.routeId
        );
    } else {
        // Insert new route
        const stmt = db.prepare(`
            INSERT INTO route_performance (
                route_id, total_attempts, successful_attempts, failed_attempts,
                success_rate, total_profit, avg_profit, best_profit, last_execution
            ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)
        `);

        const isSuccess = execution.status === 'success' ? 1 : 0;
        stmt.run(
            execution.routeId,
            isSuccess,
            1 - isSuccess,
            isSuccess,
            execution.profitUsd || 0,
            execution.profitUsd || 0,
            execution.profitUsd || 0,
            execution.timestamp || Date.now()
        );
    }
}

/**
 * Update daily statistics
 */
function updateDailyStats(execution) {
    const date = new Date(execution.timestamp || Date.now()).toISOString().split('T')[0];
    
    const existing = db.prepare(`
        SELECT * FROM daily_stats WHERE date = ?
    `).get(date);

    const isSuccess = execution.status === 'success';
    const profit = execution.profitUsd || 0;

    if (existing) {
        db.prepare(`
            UPDATE daily_stats SET
                total_executions = total_executions + 1,
                successful_executions = successful_executions + ?,
                failed_executions = failed_executions + ?,
                total_profit = total_profit + ?,
                total_loss = total_loss + ?,
                net_profit = total_profit + ? - total_loss - ?,
                avg_profit_per_trade = (total_profit + ?) / (successful_executions + ?),
                best_trade_profit = MAX(best_trade_profit, ?),
                worst_trade_loss = MIN(worst_trade_loss, ?),
                total_gas_spent = total_gas_spent + ?
            WHERE date = ?
        `).run(
            isSuccess ? 1 : 0,
            isSuccess ? 0 : 1,
            isSuccess ? profit : 0,
            isSuccess ? 0 : Math.abs(profit),
            isSuccess ? profit : 0,
            isSuccess ? 0 : Math.abs(profit),
            isSuccess ? profit : 0,
            isSuccess ? 1 : 0,
            profit,
            profit,
            (execution.gasUsed || 0) * (execution.gasPriceGwei || 0) / 1e9,
            date
        );
    } else {
        db.prepare(`
            INSERT INTO daily_stats (
                date, total_executions, successful_executions, failed_executions,
                total_profit, total_loss, net_profit, avg_profit_per_trade,
                best_trade_profit, worst_trade_loss, total_gas_spent
            ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            date,
            isSuccess ? 1 : 0,
            isSuccess ? 0 : 1,
            isSuccess ? profit : 0,
            isSuccess ? 0 : Math.abs(profit),
            isSuccess ? profit : -Math.abs(profit),
            isSuccess ? profit : 0,
            profit,
            profit,
            (execution.gasUsed || 0) * (execution.gasPriceGwei || 0) / 1e9
        );
    }
}

/**
 * Get overall statistics
 */
export function getStats() {
    return db.prepare(`
        SELECT 
            COUNT(*) as total_executions,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_executions,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_executions,
            CAST(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100 as success_rate,
            SUM(CASE WHEN status = 'success' THEN profit_usd ELSE 0 END) as total_profit,
            AVG(CASE WHEN status = 'success' THEN profit_usd ELSE NULL END) as avg_profit,
            MAX(profit_usd) as best_profit,
            MIN(profit_usd) as worst_loss
        FROM executions
    `).get();
}

/**
 * Get daily statistics for a specific date
 */
export function getDailyStats(date) {
    return db.prepare(`
        SELECT * FROM daily_stats WHERE date = ?
    `).get(date);
}

/**
 * Get route performance statistics
 */
export function getRoutePerformance(routeId = null) {
    if (routeId) {
        return db.prepare(`
            SELECT * FROM route_performance WHERE route_id = ?
        `).get(routeId);
    } else {
        return db.prepare(`
            SELECT * FROM route_performance ORDER BY total_profit DESC
        `).all();
    }
}

/**
 * Get recent executions
 */
export function getRecentExecutions(limit = 10) {
    return db.prepare(`
        SELECT * FROM executions 
        ORDER BY timestamp DESC 
        LIMIT ?
    `).all(limit);
}

/**
 * Get executions by date range
 */
export function getExecutionsByDateRange(startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    return db.prepare(`
        SELECT * FROM executions 
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp DESC
    `).all(start, end);
}

/**
 * Clean up old data (older than N days)
 */
export function cleanupOldData(daysToKeep = 90) {
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    const result = db.prepare(`
        DELETE FROM executions WHERE timestamp < ?
    `).run(cutoffDate);
    
    console.log(`Cleaned up ${result.changes} old records`);
}

// Initialize database on module load
initializeDatabase();

export default db;
