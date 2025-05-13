const Razorpay = require('razorpay');
const crypto = require('crypto');

// Check if RazorPay keys are present in the environment
const isRazorPayConfigured = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;

// Initialize RazorPay client if credentials are available
let razorpayClient = null;

if (isRazorPayConfigured) {
    razorpayClient = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
}

// Helper to create a demo order when RazorPay is not configured
const createDemoOrder = (options) => {
    const orderId = 'demo_order_' + crypto.randomBytes(8).toString('hex');
    
    return {
        id: orderId,
        entity: 'order',
        amount: options.amount,
        amount_paid: 0,
        amount_due: options.amount,
        currency: options.currency || 'INR',
        receipt: options.receipt,
        status: 'created',
        attempts: 0,
        created_at: Date.now()
    };
};

// Helper to create a demo subscription when RazorPay is not configured
const createDemoSubscription = (options) => {
    const subscriptionId = 'demo_sub_' + crypto.randomBytes(8).toString('hex');
    
    return {
        id: subscriptionId,
        entity: 'subscription',
        plan_id: 'demo_plan_' + crypto.randomBytes(5).toString('hex'),
        customer_id: 'demo_cust_' + crypto.randomBytes(5).toString('hex'),
        status: 'created',
        current_start: Date.now(),
        current_end: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days later
        ended_at: null,
        quantity: 1,
        notes: options.notes || {},
        charge_at: Date.now(),
        total_count: options.count,
        paid_count: 0
    };
};

/**
 * Create an order for one-time payment
 * 
 * @param {Object} options Order options
 * @param {number} options.amount Amount in smallest currency unit (paise for INR)
 * @param {string} options.currency Currency code (default: INR)
 * @param {string} options.receipt Order receipt ID
 * @param {Object} options.notes Additional notes
 * @returns {Promise<Object>} Created order object
 */
const createOrder = async (options) => {
    if (!isRazorPayConfigured) {
        console.log('RazorPay not configured, using demo mode');
        return createDemoOrder(options);
    }
    
    try {
        const order = await razorpayClient.orders.create(options);
        return order;
    } catch (error) {
        console.error('RazorPay create order error:', error);
        throw error;
    }
};

/**
 * Create a subscription for recurring payments
 * 
 * @param {Object} options Subscription options
 * @param {string} options.plan_id RazorPay plan ID
 * @param {number} options.total_count Total number of subscription cycles
 * @param {string} options.customer_id RazorPay customer ID (optional)
 * @param {Object} options.notes Additional notes (optional)
 * @returns {Promise<Object>} Created subscription object
 */
const createSubscription = async (options) => {
    if (!isRazorPayConfigured) {
        console.log('RazorPay not configured, using demo mode');
        return createDemoSubscription(options);
    }
    
    try {
        const subscription = await razorpayClient.subscriptions.create(options);
        return subscription;
    } catch (error) {
        console.error('RazorPay create subscription error:', error);
        throw error;
    }
};

/**
 * Verify payment signature
 * 
 * @param {Object} options Signature verification options
 * @param {string} options.razorpay_order_id RazorPay order ID
 * @param {string} options.razorpay_payment_id RazorPay payment ID
 * @param {string} options.razorpay_signature RazorPay signature
 * @returns {boolean} Whether signature is valid
 */
const verifyPaymentSignature = (options) => {
    if (!isRazorPayConfigured) {
        console.log('RazorPay not configured, using demo mode');
        return true;
    }
    
    try {
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(options.razorpay_order_id + '|' + options.razorpay_payment_id)
            .digest('hex');
        
        return generatedSignature === options.razorpay_signature;
    } catch (error) {
        console.error('RazorPay signature verification error:', error);
        return false;
    }
};

/**
 * Cancel subscription
 * 
 * @param {string} subscriptionId RazorPay subscription ID
 * @param {boolean} cancelAtCycleEnd Whether to cancel at the end of current cycle
 * @returns {Promise<Object>} Cancelled subscription object
 */
const cancelSubscription = async (subscriptionId, cancelAtCycleEnd = true) => {
    if (!isRazorPayConfigured) {
        console.log('RazorPay not configured, using demo mode');
        return { 
            id: subscriptionId, 
            status: 'cancelled' 
        };
    }
    
    try {
        const subscription = await razorpayClient.subscriptions.cancel(
            subscriptionId, 
            { cancel_at_cycle_end: cancelAtCycleEnd }
        );
        return subscription;
    } catch (error) {
        console.error('RazorPay cancel subscription error:', error);
        throw error;
    }
};

module.exports = {
    isRazorPayConfigured,
    createOrder,
    createSubscription,
    verifyPaymentSignature,
    cancelSubscription
}; 