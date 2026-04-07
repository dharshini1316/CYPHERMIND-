const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const SecurityEventSchema = new mongoose.Schema({
    type: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
    details: { type: Object, default: {} },
    user_id: { type: String }
});

const SecurityEvent = mongoose.model('SecurityEvent', SecurityEventSchema);

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing simulation events to start fresh for demo
    await SecurityEvent.deleteMany({ type: 'simulated_attack' });

    const demoEvents = [
        {
            type: 'simulated_attack',
            severity: 'high',
            timestamp: new Date(Date.now() - 3600000),
            details: {
                attack_description: 'Basic Override',
                threat_type: 'prompt_injection',
                success: true,
                risk_score: 85,
                suggested_fix: 'Implement strict prompt delimiters.',
                pr_url: 'https://github.com/CypherMIND/security-fixes/pull/remediation-101'
            }
        },
        {
            type: 'simulated_attack',
            severity: 'critical',
            timestamp: new Date(Date.now() - 1800000),
            details: {
                attack_description: 'Complex Exfiltration',
                threat_type: 'data_exfiltration',
                success: true,
                risk_score: 98,
                suggested_fix: 'Apply PII redaction layer to all RAG outputs.',
                pr_url: 'https://github.com/CypherMIND/security-fixes/pull/remediation-202'
            }
        }
    ];

    await SecurityEvent.insertMany(demoEvents);
    console.log('✅ Demo data seeded successfully!');
    await mongoose.disconnect();
}

seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
