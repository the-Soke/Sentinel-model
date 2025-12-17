import express from "express";

const router = express.Router();

// mock response for demo
router.get("/hotspots", (_, res) => {
  res.json([
    { lat: 9.08, lng: 7.49, risk: "High" },
    { lat: 10.52, lng: 7.44, risk: "Medium" }
  ]);
});

export default router;
