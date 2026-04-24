const express = require("express");
const router = express.Router();

router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    res.json({
      success: true,
      order: {
        id: "test_order_123",
        amount: amount,
        currency: "INR"
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
