import { prisma } from '../src/lib/prisma.js';
import { assertDestructiveSeedIsAllowed } from '../src/lib/seed-safety.js';

// This script resets the database to demo content. It must never run against
// the production database that contains real people and posts.
assertDestructiveSeedIsAllowed();

async function seed() {
  console.log('🌱 Seeding campus database...');

  // Clean existing data to avoid unique constraint issues
  await prisma.report.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.communityRule.deleteMany({});
  await prisma.pollVote.deleteMany({});
  await prisma.vote.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.pollOption.deleteMany({});
  await prisma.poll.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.communityMember.deleteMany({});
  await prisma.community.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lastbench.app' },
    update: {},
    create: {
      email: 'admin@lastbench.app',
      username: 'admin',
      displayName: 'Campus Admin',
      passwordHash: '$2b$12$R.UzFKOr9Eka9mnMdJQKSebfyXwcArZlBQ5mt0pz5TD9IpQgFt5Ly', // "Admin123" — real bcrypt hash (was a bare SHA-256 hex string that could never match bcrypt.compare, so no seeded account could ever log in)
      role: 'ADMIN',
      branch: 'IT',
      year: 4,
      emailVerified: true,
    },
  });

  // Create real-feeling student users across a multi-campus environment
  const user1 = await prisma.user.create({
    data: {
      email: 'student_alpha@university.edu',
      username: 'student_alpha',
      displayName: 'Campus Explorer',
      passwordHash: '$2b$12$R.UzFKOr9Eka9mnMdJQKSebfyXwcArZlBQ5mt0pz5TD9IpQgFt5Ly', // "Admin123" — real bcrypt hash (was a bare SHA-256 hex string that could never match bcrypt.compare, so no seeded account could ever log in)
      branch: 'CSE',
      year: 3,
      emailVerified: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'kovai_coder@university.edu',
      username: 'kovai_coder',
      displayName: 'Kovai Coder',
      passwordHash: '$2b$12$R.UzFKOr9Eka9mnMdJQKSebfyXwcArZlBQ5mt0pz5TD9IpQgFt5Ly', // "Admin123" — real bcrypt hash (was a bare SHA-256 hex string that could never match bcrypt.compare, so no seeded account could ever log in)
      branch: 'ECE',
      year: 2,
      emailVerified: true,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'csk_veriyan@university.edu',
      username: 'csk_veriyan',
      displayName: 'CSK Veriyan',
      passwordHash: '$2b$12$R.UzFKOr9Eka9mnMdJQKSebfyXwcArZlBQ5mt0pz5TD9IpQgFt5Ly', // "Admin123" — real bcrypt hash (was a bare SHA-256 hex string that could never match bcrypt.compare, so no seeded account could ever log in)
      branch: 'Mech',
      year: 4,
      emailVerified: true,
    },
  });

  const user4 = await prisma.user.create({
    data: {
      email: 'namma_campus@university.edu',
      username: 'namma_campus',
      displayName: 'Namma Campus',
      passwordHash: '$2b$12$R.UzFKOr9Eka9mnMdJQKSebfyXwcArZlBQ5mt0pz5TD9IpQgFt5Ly', // "Admin123" — real bcrypt hash (was a bare SHA-256 hex string that could never match bcrypt.compare, so no seeded account could ever log in)
      branch: 'IT',
      year: 3,
      emailVerified: true,
    },
  });

  // Create Generic Groups
  const communities = await Promise.all([
    prisma.community.create({
      data: { name: 'General', slug: 'general', description: 'Open forum for all discussions', category: 'general', isDefault: true },
    }),
    prisma.community.create({
      data: { name: 'Programming', slug: 'programming', description: 'Coding projects, hackathons, and software development', category: 'academic', isDefault: true },
    }),
    prisma.community.create({
      data: { name: 'Academics', slug: 'academics', description: 'Study materials, exams, and coursework', category: 'academic', isDefault: true },
    }),
    prisma.community.create({
      data: { name: 'Placements', slug: 'placements', description: 'Placement discussions, coding rounds, and interview updates', category: 'placement', isDefault: true },
    }),
    prisma.community.create({
      data: { name: 'Projects', slug: 'projects', description: 'Find teammates and collaborate on projects', category: 'academic', isDefault: true },
    }),
    prisma.community.create({
      data: { name: 'Memes', slug: 'memes', description: 'Unhinged department roasts and daily struggles', category: 'memes', isDefault: true },
    }),
    prisma.community.create({
      data: { name: 'Events', slug: 'events', description: 'Symposiums, cultural fests, and campus events', category: 'events', isDefault: true },
    }),
    prisma.community.create({
      data: { name: 'Sports', slug: 'sports', description: 'Intramurals, tournaments, and sports talk', category: 'sports', isDefault: true },
    }),
    prisma.community.create({
      data: { name: 'Hostel', slug: 'hostel', description: 'Warden stories, room shenanigans, and mess food', category: 'hostel', isDefault: true },
    }),
    prisma.community.create({
      data: { name: 'Buy & Sell', slug: 'buy-and-sell', description: 'Buy or sell books, lab coats, and electronics', category: 'market', isDefault: true },
    }),
    prisma.community.create({
      data: { name: 'Lost & Found', slug: 'lost-and-found', description: 'Post items you have lost or found on campus', category: 'market', isDefault: true },
    }),
    prisma.community.create({
      data: { name: 'Confessions', slug: 'confessions', description: 'Anonymous confessions and campus tea', category: 'general', isDefault: true },
    }),
  ]);

  // Join communities
  for (const community of communities) {
    for (const user of [admin, user1, user2, user3, user4]) {
      await prisma.communityMember.create({
        data: { userId: user.id, communityId: community.id },
      });
    }
  }

  // Create rich, relatable post data
  const postsData = [
    {
      authorId: user3.id,
      communityId: communities[0]!.id,
      title: 'CSK Yellow Army on Campus! 💛🦁',
      content: "Dhoni's last over sixes vs RCB at Chepauk was absolute peak cinema. The boys hostel TV room went completely wild! RCB fans in our department were silent. Who else is watching the playoffs tonight in Block C? Let's gather in the lobby!",
      isAnonymous: false,
      tags: ['ipl', 'csk', 'dhoni', 'hostel', 'cricket'],
      score: 148,
    },
    {
      authorId: user2.id,
      communityId: communities[3]!.id,
      title: 'To the ECE girl near the library window 😭',
      content: "To the ECE girl who sits near the window in the library everyday listening to Anirudh songs on loop: I've been trying to find your Instagram for two semesters now. Someone help a brother out. How do I start a conversation without making it awkward?",
      isAnonymous: true,
      tags: ['confession', 'crush', 'library', 'ece'],
      score: 92,
    },
    {
      authorId: user1.id,
      communityId: communities[3]!.id,
      title: 'Product Company Placement Prep 💻',
      content: "A top tech company is visiting campus next week for the Associate Software Engineer role. Anyone has previous round coding questions? I heard the second round focuses heavily on DSA and C/Java concepts. Please share your experiences if you attended last year's drives!",
      isAnonymous: true,
      tags: ['placement', 'coding', 'interviews'],
      score: 76,
    },
    {
      authorId: user4.id,
      communityId: communities[8]!.id,
      title: 'The Wednesday Biryani Tragedy 😭🍗',
      content: "The Wednesday chicken biryani in the boys hostel is literally just yellow-colored tomato rice with a single piece of potato. Can we write a mass petition to the warden? This is unfair for the mess fees we pay. Who is ready to sign?",
      isAnonymous: true,
      tags: ['hostel', 'food', 'mess', 'rant'],
      score: 112,
    },
    {
      authorId: user3.id,
      communityId: communities[5]!.id,
      title: 'Mech drawing boards are cheat codes 💀',
      content: "When the professor says 'this is a strict college' but the Mech department guys are busy playing BGMI behind the big drawing boards during engineering graphics class 💀",
      isAnonymous: true,
      tags: ['memes', 'mech', 'graphics', 'gaming'],
      score: 154,
    },
    {
      authorId: user2.id,
      communityId: communities[0]!.id,
      title: 'Bus Ride in Rain 🌧️🚌',
      content: "Nothing beats the bus ride back home in this rainy weather with Yuvan Shankar Raja's melody playlist in the headphones. Absolute aesthetic vibe. The weather hits different during the monsoon!",
      isAnonymous: false,
      tags: ['travel', 'rain', 'vibes'],
      score: 85,
    },
    {
      authorId: user1.id,
      communityId: communities[1]!.id,
      title: 'Built a local bus tracker for day-scholars! 🚀',
      content: "I got tired of missing the local town buses, so I built a real-time crowd-sourced bus tracking app for day-scholars using React Native and Node.js. Check out the screenshot of the dashboard coding layout!",
      isAnonymous: false,
      tags: ['webdev', 'reactnative', 'bus-tracker', 'showcase'],
      score: 210,
      mediaUrls: ['https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=800&q=80'],
    },
    {
      authorId: user4.id,
      communityId: communities[0]!.id,
      title: 'The Ultimate Breakfast Debate 🥞',
      content: "Hot Ghee Roast with Sambhar & Coconut Chutney at the college canteen is the absolute goat breakfast. Fight me in the comments. 😤",
      isAnonymous: false,
      tags: ['canteen', 'food', 'southindian'],
      score: 67,
      mediaUrls: ['https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80'],
    },
  ];

  // Insert Posts and add comments
  for (const postInfo of postsData) {
    const post = await prisma.post.create({
      data: postInfo,
    });

    // Add nested comments to make the feed feel alive
    if (postInfo.title.includes('CSK')) {
      const c1 = await prisma.comment.create({
        data: { authorId: user2.id, postId: post.id, content: "Bro, the hostel lounge was vibrating! Dhoni's sixes are legendary. 💛", isAnonymous: false, score: 20 },
      });
      const c2 = await prisma.comment.create({
        data: { authorId: user1.id, postId: post.id, content: "RCB fans in CSE block were completely quiet the next day. 😂", isAnonymous: true, score: 15 },
      });
      await prisma.comment.create({
        data: { authorId: user3.id, postId: post.id, parentId: c1.id, content: "True! I was there, we literally ran around the lobby celebrating.", isAnonymous: false, depth: 1, score: 10 },
      });
      await prisma.post.update({ where: { id: post.id }, data: { commentCount: 3 } });
    } else if (postInfo.title.includes('Biryani')) {
      const c1 = await prisma.comment.create({
        data: { authorId: user3.id, postId: post.id, content: "Count me in for the petition. The chicken pieces are dry as cardboard.", isAnonymous: false, score: 18 },
      });
      await prisma.comment.create({
        data: { authorId: user2.id, postId: post.id, parentId: c1.id, content: "Same here. Even the veg menu has better flavor sometimes.", isAnonymous: true, depth: 1, score: 7 },
      });
      await prisma.post.update({ where: { id: post.id }, data: { commentCount: 2 } });
    } else if (postInfo.title.includes('Debate')) {
      const c1 = await prisma.comment.create({
        data: { authorId: user1.id, postId: post.id, content: "Poori Masala is the real canteen king, Ghee roast is too light. 😤", isAnonymous: false, score: 12 },
      });
      await prisma.comment.create({
        data: { authorId: user4.id, postId: post.id, parentId: c1.id, content: "Poori is too oily bro, Ghee roast with that green chutney is supreme.", isAnonymous: false, depth: 1, score: 5 },
      });
      await prisma.post.update({ where: { id: post.id }, data: { commentCount: 2 } });
    }
  }

  // Create Poll Posts
  // Poll 1
  await prisma.post.create({
    data: {
      authorId: user3.id,
      communityId: communities[0]!.id,
      title: 'Who is winning the IPL match tonight at Chepauk? 🏆',
      content: 'The ultimate South Indian clash is happening tonight. Predict the winner!',
      type: 'POLL',
      isAnonymous: false,
      tags: ['poll', 'ipl', 'csk', 'cricket'],
      score: 54,
      poll: {
        create: {
          options: {
            create: [
              { text: 'Chennai Super Kings (CSK) 💛🦁', orderNum: 0 },
              { text: 'Royal Challengers Bengaluru (RCB) ❤️', orderNum: 1 },
              { text: 'Mumbai Indians (MI) 💙', orderNum: 2 },
              { text: 'Sunrisers Hyderabad (SRH) 🧡', orderNum: 3 },
            ],
          },
        },
      },
    },
  });

  // Poll 2
  await prisma.post.create({
    data: {
      authorId: user2.id,
      communityId: communities[8]!.id,
      title: 'Best hangout spot near campus after class? ☕🏍️',
      content: 'Where do we go when the final bell rings?',
      type: 'POLL',
      isAnonymous: true,
      tags: ['poll', 'hangout', 'canteen'],
      score: 68,
      poll: {
        create: {
          options: {
            create: [
              { text: 'The local tea shops outside the gate ☕', orderNum: 0 },
              { text: 'Town central cafes 🍔', orderNum: 1 },
              { text: 'Highway long ride 🏍️', orderNum: 2 },
              { text: 'Just sleeping in the hostel room 😴', orderNum: 3 },
            ],
          },
        },
      },
    },
  });

  // Poll 3
  await prisma.post.create({
    data: {
      authorId: user1.id,
      communityId: communities[3]!.id,
      title: 'Which company is your dream target this placement season? 💼',
      content: "Let's see the placement targets of pre-final and final years.",
      type: 'POLL',
      isAnonymous: false,
      tags: ['poll', 'placement', 'careers'],
      score: 42,
      poll: {
        create: {
          options: {
            create: [
              { text: 'Top Product Company (Development) 💻', orderNum: 0 },
              { text: 'Consulting / Tech Services (IT) 🏢', orderNum: 1 },
              { text: 'Core engineering company (ECE/Mech core) ⚡', orderNum: 2 },
              { text: 'Off-campus remote product startups 🌍', orderNum: 3 },
            ],
          },
        },
      },
    },
  });

  console.log('✅ Seed complete!');
  console.log(`   ${(await prisma.user.count())} users`);
  console.log(`   ${(await prisma.community.count())} groups`);
  console.log(`   ${(await prisma.post.count())} posts`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
