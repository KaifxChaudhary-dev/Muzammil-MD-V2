const mongoose = require('mongoose');

// ============ SCHEMAS ============
const userSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    username: String,
    points: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    experience: { type: Number, default: 0 },
    warns: { type: Number, default: 0 },
    isBanned: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    premiumExpiry: Date,
    messageCount: { type: Number, default: 0 },
    lastMessage: Date,
    joinedAt: { type: Date, default: Date.now }
});

const groupSchema = new mongoose.Schema({
    groupId: { type: String, unique: true },
    name: String,
    settings: {
        antiDelete: { type: Boolean, default: true },
        antiViewOnce: { type: Boolean, default: true },
        autoReaction: { type: Boolean, default: true },
        antiLink: { type: Boolean, default: false },
        antiSpam: { type: Boolean, default: false },
        welcomeMessage: { type: String, default: '' },
        goodbyeMessage: { type: String, default: '' },
        onlyAdmin: { type: Boolean, default: false }
    },
    members: [String],
    admins: [String],
    banned: [String],
    createdAt: { type: Date, default: Date.now }
});

const statusSchema = new mongoose.Schema({
    statusId: String,
    userId: String,
    type: String,
    content: String,
    viewed: { type: Boolean, default: false },
    reactions: [{
        userId: String,
        emoji: String
    }],
    createdAt: { type: Date, default: Date.now }
});

const settingSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    value: mongoose.Schema.Types.Mixed
});

// ============ MODELS ============
const User = mongoose.model('User', userSchema);
const Group = mongoose.model('Group', groupSchema);
const Status = mongoose.model('Status', statusSchema);
const Setting = mongoose.model('Setting', settingSchema);

// ============ DATABASE CLASS ============
class Database {
    async connect() {
        try {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/muzammil_md');
            console.log('✅ MongoDB Connected');
        } catch (error) {
            console.error('❌ MongoDB Error:', error);
            throw error;
        }
    }

    // ===== USER METHODS =====
    async getUser(userId) {
        let user = await User.findOne({ userId });
        if (!user) {
            user = new User({ userId });
            await user.save();
        }
        return user;
    }

    async updateUser(userId, data) {
        return await User.findOneAndUpdate(
            { userId },
            data,
            { upsert: true, new: true }
        );
    }

    async addPoints(userId, points) {
        const user = await this.getUser(userId);
        user.points += points;
        await user.save();
        return user;
    }

    async addExperience(userId, exp) {
        const user = await this.getUser(userId);
        user.experience += exp;
        const requiredExp = user.level * 100;
        if (user.experience >= requiredExp) {
            user.level += 1;
            user.experience = 0;
            await user.save();
            return { leveledUp: true, newLevel: user.level };
        }
        await user.save();
        return { leveledUp: false };
    }

    async getUserRank(userId) {
        const users = await User.find().sort({ points: -1 });
        const index = users.findIndex(u => u.userId === userId);
        return index + 1;
    }

    // ===== GROUP METHODS =====
    async getGroup(groupId) {
        let group = await Group.findOne({ groupId });
        if (!group) {
            group = new Group({ groupId });
            await group.save();
        }
        return group;
    }

    async updateGroup(groupId, data) {
        return await Group.findOneAndUpdate(
            { groupId },
            data,
            { upsert: true, new: true }
        );
    }

    async addMember(groupId, userId) {
        const group = await this.getGroup(groupId);
        if (!group.members.includes(userId)) {
            group.members.push(userId);
            await group.save();
        }
        return group;
    }

    async removeMember(groupId, userId) {
        const group = await this.getGroup(groupId);
        group.members = group.members.filter(m => m !== userId);
        await group.save();
        return group;
    }

    // ===== STATUS METHODS =====
    async saveStatus(statusData) {
        const status = new Status(statusData);
        await status.save();
        return status;
    }

    async getStatuses(userId, limit = 10) {
        return await Status.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    // ===== SETTING METHODS =====
    async getSetting(key, defaultValue = null) {
        const setting = await Setting.findOne({ key });
        return setting ? setting.value : defaultValue;
    }

    async setSetting(key, value) {
        return await Setting.findOneAndUpdate(
            { key },
            { value },
            { upsert: true, new: true }
        );
    }

    // ===== STATS METHODS =====
    async getTotalUsers() {
        return await User.countDocuments();
    }

    async getTotalGroups() {
        return await Group.countDocuments();
    }

    async getActiveUsers() {
        const now = new Date();
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        return await User.countDocuments({
            lastMessage: { $gte: sevenDaysAgo }
        });
    }
}

module.exports = new Database();
