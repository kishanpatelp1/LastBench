import { prisma } from '../src/lib/prisma.js';

async function seed() {
  console.log('🌱 Seeding Dr. Mahalingam College of Engineering and Technology (MCET) database...');

  // Clean existing data to avoid unique constraint issues
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
      displayName: 'MCET Admin',
      passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // "Admin123"
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  // Create real-feeling MCET student users
  const user1 = await prisma.user.create({
    data: {
      email: 'pollachi_king@mcet.in',
      username: 'pollachi_king',
      displayName: 'Pollachi King',
      passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // "Admin123"
      college: 'MCET Pollachi',
      branch: 'CSE',
      year: 3,
      emailVerified: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'kovai_coder@mcet.in',
      username: 'kovai_coder',
      displayName: 'Kovai Coder',
      passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // "Admin123"
      college: 'MCET Pollachi',
      branch: 'ECE',
      year: 2,
      emailVerified: true,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'csk_veriyan@mcet.in',
      username: 'csk_veriyan',
      displayName: 'CSK Veriyan',
      passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // "Admin123"
      college: 'MCET Pollachi',
      branch: 'Mech',
      year: 4,
      emailVerified: true,
    },
  });

  const user4 = await prisma.user.create({
    data: {
      email: 'namma_mcet@mcet.in',
      username: 'namma_mcet',
      displayName: 'Namma MCET',
      passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // "Admin123"
      college: 'MCET Pollachi',
      branch: 'IT',
      year: 3,
      emailVerified: true,
    },
  });

  // Create MCET Specific Communities
  const communities = await Promise.all([
    prisma.community.create({
      data: { name: 'General', slug: 'general', description: 'Open forum for all MCETians', category: 'general', isDefault: true },
    }),
    prisma.community.create({
      data: { name: 'MCET Placements', slug: 'mcet-placements', description: 'Placement discussions, coding rounds, and interview updates for MCET Pollachi', college: 'MCET Pollachi', category: 'placement' },
    }),
    prisma.community.create({
      data: { name: 'MCET Memes', slug: 'mcet-memes', description: 'Unhinged department roasts, drawing board memes, and Pollachi travel struggles', college: 'MCET Pollachi', category: 'memes' },
    }),
    prisma.community.create({
      data: { name: 'Campus Confessions', slug: 'campus-confessions', description: 'Anonymous confessions and classroom crushes from MCET students', category: 'general', isDefault: true },
    }),
    prisma.community.create({
      data: { name: 'Tech Talk', slug: 'tech-talk', description: 'Coding projects, symposium preparation, and hackathons', category: 'academic', isDefault: true },
    }),
    prisma.community.create({
      data: { name: 'Hostel Life', slug: 'hostel-life', description: 'Warden stories, room shenanigans, and Wednesday mess menu reviews', category: 'hostel', isDefault: true },
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

  // Create rich MCET, IPL, and South Indian posts
  const postsData = [
    {
      authorId: user3.id,
      communityId: communities[0]!.id,
      title: 'CSK Yellow Army in MCET! 💛🦁',
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
      communityId: communities[1]!.id,
      title: 'Zoho Campus Placement Prep 💻',
      content: "Zoho is visiting MCET next week for the Associate Software Engineer role. Anyone has previous round coding questions? I heard the second round focuses heavily on DSA and C/Java concepts. Please share your experiences if you attended last year's drives!",
      isAnonymous: true,
      tags: ['placement', 'zoho', 'coding', 'interviews'],
      score: 76,
    },
    {
      authorId: user4.id,
      communityId: communities[5]!.id,
      title: 'The Wednesday Biryani Tragedy 😭🍗',
      content: "The Wednesday chicken biryani in the boys hostel is literally just yellow-colored tomato rice with a single piece of potato. Can we write a mass petition to the warden? This is unfair for the mess fees we pay. Who is ready to sign?",
      isAnonymous: true,
      tags: ['hostel', 'food', 'mess', 'rant'],
      score: 112,
    },
    {
      authorId: user3.id,
      communityId: communities[2]!.id,
      title: 'Mech drawing boards are cheat codes 💀',
      content: "When the professor says 'MCET is a strict college' but the Mech department guys are busy playing BGMI behind the big drawing boards during engineering graphics class 💀",
      isAnonymous: true,
      tags: ['memes', 'mech', 'graphics', 'gaming'],
      score: 154,
    },
    {
      authorId: user2.id,
      communityId: communities[0]!.id,
      title: 'Pollachi to Kovai Bus Ride in Rain 🌧️🚌',
      content: "Nothing beats the Pollachi-Coimbatore bus ride in this rainy weather with Yuvan Shankar Raja's melody playlist in the headphones. Absolute aesthetic vibe. Pollachi weather hits different during the monsoon!",
      isAnonymous: false,
      tags: ['pollachi', 'travel', 'rain', 'vibes'],
      score: 85,
    },
    {
      authorId: user1.id,
      communityId: communities[4]!.id,
      title: 'Built a local bus tracker for MCET day-scholars! 🚀',
      content: "I got tired of missing the Coimbatore to Pollachi town buses, so I built a real-time crowd-sourced bus tracking app for MCET day-scholars using React Native and Node.js. Check out the screenshot of the dashboard coding layout!",
      isAnonymous: false,
      tags: ['webdev', 'reactnative', 'mcet', 'showcase'],
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
      communityId: communities[5]!.id,
      title: 'Best hangout spot near MCET after class? ☕🏍️',
      content: 'Where do we go when the final bell rings?',
      type: 'POLL',
      isAnonymous: true,
      tags: ['poll', 'hangout', 'mcet', 'canteen'],
      score: 68,
      poll: {
        create: {
          options: {
            create: [
              { text: 'The local tea shops outside the gate ☕', orderNum: 0 },
              { text: 'Pollachi town central cafes 🍔', orderNum: 1 },
              { text: 'Coimbatore highway long ride 🏍️', orderNum: 2 },
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
      communityId: communities[1]!.id,
      title: 'Which company is your dream target this placement season? 💼',
      content: "Let's see the placement targets of MCET pre-final and final years.",
      type: 'POLL',
      isAnonymous: false,
      tags: ['poll', 'placement', 'zoho', 'careers'],
      score: 42,
      poll: {
        create: {
          options: {
            create: [
              { text: 'Zoho (Product / Development) 💻', orderNum: 0 },
              { text: 'TCS / CTS (Service / IT) 🏢', orderNum: 1 },
              { text: 'Core engineering company (ECE/Mech core) ⚡', orderNum: 2 },
              { text: 'Off-campus remote product startups 🌍', orderNum: 3 },
            ],
          },
        },
      },
    },
  });

  console.log('✅ MCET Seed complete!');
  console.log(`   ${(await prisma.user.count())} users`);
  console.log(`   ${(await prisma.community.count())} communities`);
  console.log(`   ${(await prisma.post.count())} posts`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
