// FINAL DEBUG ROUTER (services/whatsappRoute.js)
router.post("/", async (req, res) => {
    const msg = req.body.Body;
    const phone = req.body.From.replace("whatsapp:", "");

    // Using robust parsing
    const parts = msg.split(",");
    const hour = parts[parts.length - 1].trim(); 
    const location = parts.slice(0, -1).join(",").trim(); 

    console.log(`[START] Processing for location: ${location}, phone: ${phone}`); // LOG A

    try {
        // 1. BUILD FEATURES
        console.log(`[PRE-FEATURES] Building features...`); // LOG B
        const features = buildFeatures({
            // Ensure you pass all 10 required features, even if hardcoded
            location,
            hour,
            casualties: 1,
            kidnapped: 2,
            pastIncidents: 5,
            state: "Lagos", // Hardcode State just for this test
            dayOfYear: 15,
            week: 50,
            month: 12,
            timeOfDay: 2 // Hardcode for the sake of prediction
        });
        console.log(`[POST-FEATURES] Features built: ${features}`); // LOG C

        // 2. PREDICT RISK
        console.log(`[PRE-PREDICT] Predicting risk...`); // LOG D
        const { risk, confidence } = await predictRisk(features);
        console.log(`[POST-PREDICT] Risk: ${risk}, Confidence: ${confidence}`); // LOG E
        
        // 3. EXPLAIN RISK
        console.log(`[PRE-EXPLAIN] Generating explanation...`); // LOG F
        const explanation = await explainRisk({
            risk,
            location,
            time: `${hour}:00`
        });
        console.log(`[POST-EXPLAIN] Explanation generated.`); // LOG G

        // 4. SEND WHATSAPP
        const fullMessage = `🚨 SentinelAI Alert\nRisk: ${risk}\nConfidence: ${confidence}%\nLocation: ${location}\nTime: ${hour}:00\n\n${explanation}`;
        console.log(`[PRE-TWILIO] Attempting to send WhatsApp to ${phone}...`); // LOG H
        
        await sendWhatsApp(phone, fullMessage);
        
        console.log(`[SUCCESS] WhatsApp message sent successfully.`); // LOG I

        res.sendStatus(200);

    } catch (error) {
        // GLOBAL CATCH: This should only be hit if predictRisk/explainRisk throws an unhandled error.
        console.error(`[CRASH] Global Catch Hit! Failure for ${location}. Error:`, error.message); // LOG J
        
        // Final attempt to send an error message (Twilio logs are crucial here)
        await sendWhatsApp(phone, `⚠️ Fatal Error processing ${location}: ${error.message.substring(0, 100)}...`);
        
        res.sendStatus(500);
    }
});