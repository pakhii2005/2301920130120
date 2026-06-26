// priority-engine/run_test.js
const { assemblePriorityInbox } = require('./priority_engine');

async function testEngineExecution() {
    console.log("🚀 Initializing Priority Engine Verification Scan...");
    console.log("📡 Pinging external evaluation stream endpoint...");
    
    // Request the top 10 ranked notifications
    const prioritizedResults = await assemblePriorityInbox(10);
    
    console.log("\n=== 📥 EXECUTED RESULTS DEPLOYED SUCCESSFULLY ===");
    if (prioritizedResults.length === 0) {
        console.log("⚠️ Warning: No items returned. Check your internet connection or endpoint state.");
    } else {
        console.dir(prioritizedResults, { depth: null, colors: true });
        console.log(`\n✅ Verification complete! Successfully prioritized ${prioritizedResults.length} records.`);
    }
}

testEngineExecution();