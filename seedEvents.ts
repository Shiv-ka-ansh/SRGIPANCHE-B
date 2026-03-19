import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Event from './models/Event';
import path from 'path';

// Import local fallback data
const EVENT_CATEGORIES: any = {
  general: {
    label: 'General',
    color: '#CCFF00',
    events: [
      { name: 'TREASURE SAFARI', amount: 50 },
      { name: 'THE PERFECT CLICK', amount: 50 },
      { name: 'NAIL ART', amount: 50 },
      { name: 'PARICHARCHA', amount: 50 },
      { name: 'SELFIE MANIAC', amount: 50 },
      { name: 'ATTIRE', amount: 100 },
      { name: 'SANYOG SE', amount: 25 },
      { name: 'SAND ART', amount: 50 },
      { name: 'THE SLOGANEER', amount: 50 },
      { name: 'ISTEHAAAR', amount: 50 },
      { name: 'ESPRIT DE CORPS', amount: 50 },
      { name: 'CROSSWORD', amount: 50 },
      { name: 'FACE PAINTING', amount: 50 },
      { name: 'LITERARY', amount: 50 },
      { name: 'FINE ARTS', amount: 50 },
      { name: 'ARM WRESTLING', amount: 50 },
      { name: 'RANGOLI', amount: 50 },
      { name: 'MEHENDI', amount: 50 },
    ]
  },
  technical: {
    label: 'Technical',
    color: '#00FFFF',
    events: [
      { name: 'POSTER PRESENTATION', amount: 50 },
      { name: 'CIRCUIT JHAMELA', amount: 50 },
      { name: 'THE MECHANIST', amount: 50 },
      { name: 'SKY SCRAPPER', amount: 50 },
      { name: 'SOLID HAI BOSS', amount: 100 },
      { name: 'ALTITUDE WINNER', amount: 100 },
      { name: 'WAR OF MACHINES', amount: 100 },
      { name: 'WORTHY TRASH', amount: 50 },
    ]
  },
  cultural: {
    label: 'Cultural',
    color: '#FF00FF',
    events: [
      { name: 'PERSONA', amount: 100 },
      { name: 'SUR SPARDHA', amount: 50 },
      { name: 'TANZ & TWIST (Solo)', amount: 150 },
      { name: 'TANZ & TWIST (Group)', amount: 500 },
      { name: 'NUKKAD NATAK', amount: 500 },
      { name: 'STAND-UP COMEDY', amount: 50 },
      { name: 'DRAMATICS', amount: 50 },
    ]
  },
  cyber: {
    label: 'Cyber',
    color: '#FF6B00',
    events: [
      { name: 'CODE DEBUGGER', amount: 50 },
      { name: 'BLIND VIEWER', amount: 50 },
      { name: 'BATTLE WITH BYTE', amount: 50 },
      { name: 'GUESS THE TECH', amount: 50 },
      {
        name: 'ONLINE GAMING',
        amount: 50,
        subEvents: ['BGMI', 'Free Fire', 'Mini Militia', '8 Ball Pool', 'RC24', 'FIFA/E-Football', 'Tekken 3']
      },
    ]
  }
};

dotenv.config({ path: path.resolve(__dirname, '.env') });

const seedEvents = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/panache2k26');
    console.log('Connected to MongoDB');

    // Check if events exist
    const count = await Event.countDocuments();
    if (count > 0) {
      console.log('Events already seeded. Skipping.');
      process.exit(0);
    }

    console.log('Seeding events...');
    for (const key of Object.keys(EVENT_CATEGORIES)) {
      const categoryLabel = EVENT_CATEGORIES[key].label;
      const color = EVENT_CATEGORIES[key].color;
      
      for (const ev of EVENT_CATEGORIES[key].events) {
        const newEvent = new Event({
          category: categoryLabel,
          name: ev.name,
          amount: ev.amount,
          subEvents: ev.subEvents || [],
          color: color
        });
        await newEvent.save();
      }
    }
    console.log('Successfully seeded events!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding events:', error);
    process.exit(1);
  }
};

seedEvents();
