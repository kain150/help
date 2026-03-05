const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://mykain150:xHhLWRDMlSa6Kinw@cluster0.mlwxkel.mongodb.net/telegram_bots?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
    telegramId: { type: Number, required: true, unique: true },
    username: String,
    firstName: String,
    lastName: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    experience: String,
    source: String,
    tag: { type: String, default: null },
    description: { type: String, default: null },
    anonymous: { type: Boolean, default: false },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    workerNumber: { type: Number, unique: true, sparse: true },
    approvedAt: Date,
    createdAt: { type: Date, default: Date.now },
    rejectedAt: Date,
    lastActivity: Date,
    isBlocked: { type: Boolean, default: false },
    level: { type: Number, default: 1 },
    profitCount: { type: Number, default: 0 },
    payoutCount: { type: Number, default: 0 },
});

const communitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    tag: { type: String },
    description: String,
    imageUrl: String,
    imageFileId: String,
    createdAt: { type: Date, default: Date.now },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    joinRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CommunityJoinRequest' }],
    stats: {
        allTimeProfits: { type: Number, default: 5457 },
        allTimeProfitSum: { type: Number, default: 77466284 },
        influencePoints: { type: Number, default: 78300 },
        membersCount: { type: Number, default: 105 },
        membersLimit: { type: Number, default: 500 }
    }
});

const communityJoinRequestSchema = new mongoose.Schema({
    communityId: { type: String }, // или ObjectId, если связь
    userId: { type: Number },
    username: String,
    message: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const feedbackSchema = new mongoose.Schema({
    userId: { type: Number, required: true },
    username: String,
    topic: { type: String, required: true },
    message: { type: String, required: true },
    status: {
        type: String,
        enum: ['new', 'in_progress', 'resolved', 'rejected'], // добавлено 'rejected'
        default: 'new'
    },
    adminResponse: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date
});

const adminSchema = new mongoose.Schema({
    telegramId: { type: Number, required: true, unique: true },
    username: String,
    role: { type: String, default: 'admin' },
});

const counterSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    value: { type: Number, default: 0 },
});

const withdrawalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    link: { type: String }, // ссылка на чек
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    messageId: Number,
    createdAt: { type: Date, default: Date.now },
});

const notificationSchema = new mongoose.Schema({
    userId: { type: Number },
    adminId: { type: Number },
    text: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed },
    isSent: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const agencyClientSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true },
    username: String,
    firstName: String,
    lastName: String,
    city: String,
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'RUB' },
    registeredAt: { type: Date, default: Date.now },
    lastActivity: Date,
    invitedBy: { type: Number, default: null }, // <- изменено на Number
    step: { type: String, default: null },
    tempCity: { type: String, default: null },
    lastMsgId: { type: Number, default: null },
    lastKeyboardMsgId: { type: Number, default: null },
    isRegistered: { type: Boolean, default: false },
});
// Модель заказа
const orderSchema = new mongoose.Schema({
    userId: { type: Number, required: true },
    modelId: Number,
    modelName: String,
    hours: Number,
    baseAmount: Number,
    extraTotal: Number,
    totalAmount: Number,
    paymentMethod: String, // 'balance', 'card', 'sbp', 'crypto'
    status: { type: String, enum: ['pending', 'paid', 'completed', 'cancelled'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    paidAt: Date,
    managerNotified: { type: Boolean, default: false } // флаг для уведомления админа
});
// Модель пополнения баланса
const depositSchema = new mongoose.Schema({
    userId: Number,
    amount: Number,
    method: String,
    status: { type: String, enum: ['pending', 'completed', 'expired'], default: 'pending' },
    expiresAt: Date,
    createdAt: { type: Date, default: Date.now },
    completedAt: Date
});
// Модель вывода средств
const withdrawalRequestSchema = new mongoose.Schema({
    userId: Number,
    amount: Number,
    method: String,
    details: Object, // реквизиты
    status: { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    processedAt: Date
});

const modelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    age: { type: Number, required: true },
    city: { type: String, required: true },
    description: { type: String, default: '' },
    photo: { type: String, required: true },
    rating: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
    bust: { type: String, default: '' },
    ethnicity: { type: String, default: '' },
    build: { type: String, default: '' },
    hair_color: { type: String, default: '' },
    services: [{ type: String }],
    tariffs: {
        1: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        3: { type: Number, default: 0 }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Виртуальное поле price, которое всегда равно tariffs.1
modelSchema.virtual('price').get(function() {
    return this.tariffs ? this.tariffs[1] : 0;
});

// Чтобы виртуальное поле включалось в JSON
modelSchema.set('toJSON', { virtuals: true });
modelSchema.set('toObject', { virtuals: true });
const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Counter = mongoose.model('Counter', counterSchema);
const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const Community = mongoose.model('Community', communitySchema);
const CommunityJoinRequest = mongoose.model('CommunityJoinRequest', communityJoinRequestSchema);
const AgencyClient = mongoose.model('AgencyClient', agencyClientSchema);
const Order = mongoose.model('Order', orderSchema);
const Deposit = mongoose.model('Deposit', depositSchema);
const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
const Model = mongoose.model('Model', modelSchema);

module.exports = {
    User,
    Admin,
    Counter,
    Withdrawal,
    Notification,
    Feedback,
    Community,
    CommunityJoinRequest,
    AgencyClient, Order, Deposit, WithdrawalRequest,
    Model
};