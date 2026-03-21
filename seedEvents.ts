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
      { 
        name: 'TREASURE SAFARI', 
        amount: 70, 
        isTeam: true,
        description: 'Get ready for an adventure filled with mystery, excitement, and teamwork! Treasure Safari is a thrilling treasure hunt where participants race against time to decode clues and reach the final destination.',
        rules: [
          'Participants will compete in teams of three members.',
          'A series of clues and puzzles will be provided at each stage.',
          'Each clue leads to the next checkpoint, testing logic and coordination.',
          'The team that successfully solves all clues and reaches the end first emerges as the winner.'
        ]
      },
      { 
        name: 'THE PERFECT CLICK', 
        amount: 50, 
        description: 'Showcase your photography skills in the Perfect Click Event! This exciting competition is all about capturing the perfect shot that tells a story.' 
      },
      { 
        name: 'NAIL ART', 
        amount: 50, 
        description: 'Unleash your creativity and showcase your artistic flair with Nail Art! This event is all about transforming nails into stunning works of art using unique designs and techniques.',
        rules: [
          'Participants will create creative and innovative nail designs.',
          'Focus on creativity, precision, and overall presentation.',
          'Judging will be based on originality, detailing, and aesthetic appeal.'
        ]
      },
      { 
        name: 'PARICHARCHA', 
        amount: 50, 
        description: 'Paricharcha is an engaging debate competition where participants present their ideas, challenge perspectives, and showcase their speaking skills.',
        rules: [
          'Topics will be provided for discussion.',
          'Focus on clarity, confidence, and logical arguments.',
          'Judging will be based on content, delivery, and rebuttal.'
        ]
      },
      { 
        name: 'SELFIE MANIAC', 
        amount: 50, 
        description: 'Unleash your inner selfie star in the Selfie Maniac Event! This fun-filled competition is all about confidence, creativity, and capturing your best self in the most unique way possible.' 
      },
      { 
        name: 'ATTIRE', 
        amount: 100, 
        description: 'Step into the spotlight and let your style tell a story! Attire is a vibrant ramp-based event where participants showcase their creativity, confidence, and fashion sense through thoughtfully curated outfits.',
        rules: [
          'Participants will present their look based on the given theme.',
          'Focus on creativity, confidence, and overall presentation.',
          'Judging will be based on styling, expression, and stage presence.'
        ]
      },
      { 
        name: 'SANYOG SE', 
        amount: 40, 
        description: 'What if luck is all you need to win? Sanyog Se is an exciting luck-based event where every draw brings a new surprise and endless anticipation.',
        rules: [
          'Participants will take part in a random lucky draw.',
          'Each pick unlocks a surprise outcome, making every moment thrilling.',
          'No skills required—just trust your luck and enjoy the ride!'
        ]
      },
      { 
        name: 'SAND ART', 
        amount: 50, 
        description: 'Watch creativity come alive, one grain at a time! Sand Art is a captivating event where imagination meets skill, transforming simple sand into stunning visual stories.',
        rules: [
          'Participants will create unique designs and patterns using sand.',
          'Focus on creativity, detailing, and presentation.',
          'Judging will be based on originality, technique, and overall visual impact.'
        ]
      },
      { 
        name: 'THE SLOGANEER', 
        amount: 50, 
        description: 'Unleash the power of words in Sloganeer, where creativity meets impact! This event challenges participants to craft short, catchy, and meaningful slogans.' 
      },
      { 
        name: 'ISTEHAAAR', 
        amount: 50, 
        description: 'Turn your ideas into impactful visuals! Istehaaar is a poster-making event where creativity meets expression, allowing participants to convey powerful messages through art.',
        rules: [
          'Participants will design posters based on the given theme.',
          'Focus on creativity, clarity of message, and visual appeal.',
          'Judging will be based on originality, design, and presentation.'
        ]
      },
      { 
        name: 'ESPRIT DE CORPS', 
        amount: 50, 
        isTeam: true,
        description: 'Step into the spirit of teamwork with Esprit De Corps, an event that celebrates unity, coordination, and collective strength.',
        rules: [
          'This event will test your communication, trust, leadership, and team synergy in exciting and competitive tasks.'
        ]
      },
      { 
        name: 'CROSSWORD', 
        amount: 50, 
        description: 'Put your vocabulary and thinking skills to the test! Crossword is a fun and engaging word puzzle event that challenges your knowledge and presence of mind.',
        rules: [
          'Participants will solve a crossword puzzle within a given time.',
          'Focus on vocabulary, logical thinking, and speed.',
          'Judging will be based on accuracy and completion time.'
        ]
      },
      { 
        name: 'FACE PAINTING', 
        amount: 50, 
        description: 'Turn faces into living canvases and let your imagination run wild! Face Painting is a vibrant and expressive event where creativity, colors, and artistry come together to create stunning transformations.',
        rules: [
          'Participants will design and paint creative themes on faces.',
          'Focus on creativity, detailing, and color harmony.',
          'Judging will be based on originality, precision, and overall impact.'
        ]
      },
      { name: 'LITERARY', amount: 50, description: 'Showcase your prowess with words in this literature-focused event.' },
      { name: 'FINE ARTS', amount: 50, description: 'A competition to celebrate mastery over traditional and contemporary fine arts.' },
      { 
        name: 'ARM WRESTLING', 
        amount: 50, 
        description: 'Ready to test your strength and dominance? Arm Wrestling is a high-energy face-off where power, technique, and determination come into play!',
        rules: [
          'Participants will compete in one-on-one arm wrestling matches.',
          'Focus on strength, grip, and strategy.',
          'Winners will advance through knockout rounds to claim victory.'
        ]
      },
      { 
        name: 'RANGOLI', 
        amount: 50, 
        description: 'Not just colors, it’s a whole vibe! Rangoli is where creativity meets tradition, and the ground becomes your canvas to create something truly eye-catching.',
        rules: [
          'Participants will design vibrant rangoli based on the given theme.',
          'Show your creativity, symmetry, and color game.',
          'Judging will be based on originality, detailing, and overall impact.'
        ]
      },
      { name: 'MEHENDI', amount: 50, description: 'Display your creativity and precision with intricate Mehendi designs.' }
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
      { name: 'TANZ & TWIST', amount: 150 },
      { name: 'TANZ & TWIST (GROUP)', amount: 500 },
      { name: 'NUKKAD NATAK', amount: 500 },
      { name: 'STAND-UP COMEDY', amount: 50 },
      { name: 'DRAMATICS', amount: 50 },
      { name: 'PANACHE GOT TALENT', amount: 50 },
    ]
  },
  cyber: {
    label: 'Cyber',
    color: '#FF6B00',
    events: [
      {
        name: 'ONLINE GAMING',
        amount: 60,
        subEvents: ['BGMI', 'Free Fire', 'Mini Militia', '8 Ball Pool', 'RC24', 'FIFA/E-Football', 'Tekken 3']
      },
      { name: 'CODE DEBUGGER', amount: 50 },
      { name: 'BLIND VIEWER', amount: 50 },
      { name: 'BATTLE WITH BYTE', amount: 50 },
      { name: 'GUESS THE TECH', amount: 50 }
    ]
  }
};

dotenv.config({ path: path.resolve(__dirname, '.env') });

const seedEvents = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/panache2k26');
    console.log('Connected to MongoDB');

    console.log('Syncing events to database...');
    // We'll update existing events or create new ones
    for (const key of Object.keys(EVENT_CATEGORIES)) {
      const categoryLabel = EVENT_CATEGORIES[key].label;
      const color = EVENT_CATEGORIES[key].color;
      
      for (const ev of EVENT_CATEGORIES[key].events) {
        await Event.findOneAndUpdate(
          { name: ev.name, category: categoryLabel },
          {
            $set: {
              amount: ev.amount,
              description: (ev as any).description || '',
              rules: (ev as any).rules || [],
              subEvents: ev.subEvents || [],
              color: color
            }
          },
          { upsert: true, new: true }
        );
      }
    }
    
    console.log('Successfully synced events!');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing events:', error);
    process.exit(1);
  }
};

seedEvents();
