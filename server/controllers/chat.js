const Message = require('../models/Message');

// @desc    Get group messages with tier-based history limits
// @route   GET /api/chat/:groupId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userTier = req.user.subscriptionTier || 'FREE';
    
    // Define history limit based on tier
    let historyLimitDate = new Date();
    if (userTier === 'PREMIUM') {
      // 30 days of history for PRO users
      historyLimitDate.setDate(historyLimitDate.getDate() - 30);
    } else {
      // 24 hours of history for FREE users
      historyLimitDate.setHours(historyLimitDate.getHours() - 24);
    }

    const messages = await Message.find({
      groupId,
      createdAt: { $gte: historyLimitDate }
    })
    .sort({ createdAt: 1 })
    .limit(100); // Sanity limit for performance

    res.status(200).json({
      success: true,
      count: messages.length,
      tier: userTier,
      messages
    });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
