import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const QUESTION_CATEGORIES = [
  { name: 'Getting to Know You', icon: 'Sparkles', description: 'Discover new layers about each other every day' },
  { name: 'Love & Affection', icon: 'Heart', description: 'Celebrate warmth, tenderness, and what brings you close' },
  { name: 'Childhood Memories', icon: 'Smile', description: 'Revisit the stories and little moments that shaped who you are' },
  { name: 'Dreams & Future', icon: 'Compass', description: 'Imagine your shared horizons, adventures, and milestones' },
  { name: 'Deep Conversations', icon: 'BookOpen', description: 'Meaningful, vulnerable, and thought-provoking reflections' },
  { name: 'Funny Questions', icon: 'Laugh', description: 'Playful scenarios, hilarious quirks, and laughter' },
  { name: 'Relationship Reflections', icon: 'Shield', description: 'Reflect on how your bond grows and thrives together' },
  { name: 'Romance & Intimacy', icon: 'Flame', description: 'Deepen emotional connection, attraction, and romantic spark' },
  { name: 'Long Distance', icon: 'Send', description: 'Feel close no matter the miles or time zones' },
  { name: 'Random Questions', icon: 'HelpCircle', description: 'Unexpected, whimsical, and delightful icebreakers' },
];

const QUESTIONS_DATA: { category: string; intimacyLevel: number; text: string }[] = [
  // 1. Getting to Know You (10 questions)
  { category: 'Getting to Know You', intimacyLevel: 1, text: 'What is one quirky habit you have that most people do not know about?' },
  { category: 'Getting to Know You', intimacyLevel: 1, text: 'If you could master any musical instrument or art form overnight, which one would it be?' },
  { category: 'Getting to Know You', intimacyLevel: 1, text: 'What is your absolute favorite comfort food after an exhausting day?' },
  { category: 'Getting to Know You', intimacyLevel: 2, text: 'What is something you used to care deeply about that you no longer worry about at all?' },
  { category: 'Getting to Know You', intimacyLevel: 1, text: 'What is your ideal morning routine when you have nowhere to rush?' },
  { category: 'Getting to Know You', intimacyLevel: 2, text: 'Which movie or book character do you feel most kindred with?' },
  { category: 'Getting to Know You', intimacyLevel: 2, text: 'What is one topic you could talk about passionately for hours?' },
  { category: 'Getting to Know You', intimacyLevel: 1, text: 'Are you more energized by solitude, intimate conversations, or lively gatherings?' },
  { category: 'Getting to Know You', intimacyLevel: 2, text: 'What is a small everyday luxury that brings you genuine joy?' },
  { category: 'Getting to Know You', intimacyLevel: 2, text: 'What was your dream job when you were seven years old?' },

  // 2. Love & Affection (10 questions)
  { category: 'Love & Affection', intimacyLevel: 2, text: 'What was the exact moment you realized you were falling in love with me?' },
  { category: 'Love & Affection', intimacyLevel: 1, text: 'What is a little gesture I do that never fails to make your heart warm?' },
  { category: 'Love & Affection', intimacyLevel: 2, text: 'When do you feel most cherished and safe in our relationship?' },
  { category: 'Love & Affection', intimacyLevel: 2, text: 'What is your favorite memory of us laughing until our stomachs hurt?' },
  { category: 'Love & Affection', intimacyLevel: 3, text: 'How has loving each other changed the way you view the world?' },
  { category: 'Love & Affection', intimacyLevel: 2, text: 'If you could relive any single day from our time together, which would it be?' },
  { category: 'Love & Affection', intimacyLevel: 1, text: 'What is your favorite physical feature or expression of mine?' },
  { category: 'Love & Affection', intimacyLevel: 2, text: 'What is the kindest compliment I have ever given you?' },
  { category: 'Love & Affection', intimacyLevel: 3, text: 'In what ways do you feel we bring out the best in one another?' },
  { category: 'Love & Affection', intimacyLevel: 2, text: 'What is one song that always makes you think of us?' },

  // 3. Childhood Memories (10 questions)
  { category: 'Childhood Memories', intimacyLevel: 1, text: 'What was your favorite childhood toy, comfort blanket, or secret hiding spot?' },
  { category: 'Childhood Memories', intimacyLevel: 2, text: 'What family tradition from your upbringing do you cherish the most?' },
  { category: 'Childhood Memories', intimacyLevel: 2, text: 'Who was a childhood mentor, teacher, or friend who shaped your character?' },
  { category: 'Childhood Memories', intimacyLevel: 1, text: 'What was your most embarrassing or funny misadventure as a kid?' },
  { category: 'Childhood Memories', intimacyLevel: 2, text: 'What smells or sounds instantly transport you back to your childhood home?' },
  { category: 'Childhood Memories', intimacyLevel: 2, text: 'What was something you were deeply afraid of as a child that seems silly now?' },
  { category: 'Childhood Memories', intimacyLevel: 2, text: 'What was your favorite summer vacation or holiday trip growing up?' },
  { category: 'Childhood Memories', intimacyLevel: 3, text: 'What was the hardest lesson you learned during your teenage years?' },
  { category: 'Childhood Memories', intimacyLevel: 1, text: 'What after-school cartoon, show, or game did you eagerly look forward to?' },
  { category: 'Childhood Memories', intimacyLevel: 2, text: 'How are you similar to or different from your parents at your age?' },

  // 4. Dreams & Future (10 questions)
  { category: 'Dreams & Future', intimacyLevel: 2, text: 'Where would you love us to travel together for our next unforgettable trip?' },
  { category: 'Dreams & Future', intimacyLevel: 3, text: 'What does your dream morning look like ten years from today?' },
  { category: 'Dreams & Future', intimacyLevel: 2, text: 'If we could design our dream home, what is one non-negotiable room or feature?' },
  { category: 'Dreams & Future', intimacyLevel: 2, text: 'What is a personal bucket list goal you want me to help you achieve?' },
  { category: 'Dreams & Future', intimacyLevel: 3, text: 'What legacy or impact do you hope we build together in our lifetimes?' },
  { category: 'Dreams & Future', intimacyLevel: 2, text: 'What new hobby, language, or skill would you love for us to learn together?' },
  { category: 'Dreams & Future', intimacyLevel: 2, text: 'If we had a sabbatical year with infinite resources, how would we spend it?' },
  { category: 'Dreams & Future', intimacyLevel: 3, text: 'What is one fear you have about the future that I can support you with?' },
  { category: 'Dreams & Future', intimacyLevel: 2, text: 'How would you love us to celebrate our 10th or 25th anniversary?' },
  { category: 'Dreams & Future', intimacyLevel: 2, text: 'What is a wild, unconventional dream you secretly entertain?' },

  // 5. Deep Conversations (10 questions)
  { category: 'Deep Conversations', intimacyLevel: 3, text: 'What is a belief or perspective you held strongly five years ago that you now question?' },
  { category: 'Deep Conversations', intimacyLevel: 3, text: 'What does forgiveness truly mean to you, and when is it hardest to practice?' },
  { category: 'Deep Conversations', intimacyLevel: 3, text: 'When you feel overwhelmed or sad, what do you need most from me in that moment?' },
  { category: 'Deep Conversations', intimacyLevel: 3, text: 'What is an unspoken insecurity you sometimes carry quietly?' },
  { category: 'Deep Conversations', intimacyLevel: 3, text: 'What gives your life the deepest sense of meaning and purpose right now?' },
  { category: 'Deep Conversations', intimacyLevel: 3, text: 'How has your definition of a healthy, lasting relationship evolved over time?' },
  { category: 'Deep Conversations', intimacyLevel: 3, text: 'What is a question about existence or human nature you often ponder?' },
  { category: 'Deep Conversations', intimacyLevel: 3, text: 'In what ways do you feel most understood by me, and where can I listen deeper?' },
  { category: 'Deep Conversations', intimacyLevel: 3, text: 'What is the most courageous decision you have ever made in your life?' },
  { category: 'Deep Conversations', intimacyLevel: 3, text: 'If you could send a one-sentence message to your younger self, what would it say?' },

  // 6. Funny Questions (10 questions)
  { category: 'Funny Questions', intimacyLevel: 1, text: 'If a zombie apocalypse began right now, which one of us survives longer and why?' },
  { category: 'Funny Questions', intimacyLevel: 1, text: 'What is the most ridiculous excuse you ever gave to get out of social plans?' },
  { category: 'Funny Questions', intimacyLevel: 1, text: 'If you had to enter an eating competition right now, what food guarantees your win?' },
  { category: 'Funny Questions', intimacyLevel: 1, text: 'What is your spirit animal on a chaotic Monday morning versus a lazy Sunday?' },
  { category: 'Funny Questions', intimacyLevel: 1, text: 'If you were arrested with no explanation, what would our friends assume you did?' },
  { category: 'Funny Questions', intimacyLevel: 1, text: 'What is the most unhinged conspiracy theory you find entertaining to read about?' },
  { category: 'Funny Questions', intimacyLevel: 1, text: 'If our pet could suddenly speak fluent English for one minute, what would they expose?' },
  { category: 'Funny Questions', intimacyLevel: 1, text: 'Which reality TV show would we either win completely or get eliminated on day one?' },
  { category: 'Funny Questions', intimacyLevel: 1, text: 'What fashion trend from your past makes you cringe whenever you see photos?' },
  { category: 'Funny Questions', intimacyLevel: 1, text: 'If you could replace my voice with any celebrity for one day, who would it be?' },

  // 7. Relationship Reflections (10 questions)
  { category: 'Relationship Reflections', intimacyLevel: 2, text: 'What is one challenge we faced together that made our bond noticeably stronger?' },
  { category: 'Relationship Reflections', intimacyLevel: 2, text: 'How do you think our communication has improved since we first began dating?' },
  { category: 'Relationship Reflections', intimacyLevel: 2, text: 'What is something new you have learned about yourself through our relationship?' },
  { category: 'Relationship Reflections', intimacyLevel: 2, text: 'What ritual or routine of ours feels uniquely special to you?' },
  { category: 'Relationship Reflections', intimacyLevel: 3, text: 'What does being an emotionally supportive partner look like to you this month?' },
  { category: 'Relationship Reflections', intimacyLevel: 2, text: 'What is one thing you appreciate about how we handle disagreements?' },
  { category: 'Relationship Reflections', intimacyLevel: 2, text: 'How do you feel about our balance between couple time and independent personal space?' },
  { category: 'Relationship Reflections', intimacyLevel: 2, text: 'What is a small promise we made to each other that you treasure?' },
  { category: 'Relationship Reflections', intimacyLevel: 3, text: 'When was a time you felt exceptionally proud to stand by my side?' },
  { category: 'Relationship Reflections', intimacyLevel: 2, text: 'What is one area of our relationship you would love to nurture more this season?' },

  // 8. Romance & Intimacy (10 questions)
  { category: 'Romance & Intimacy', intimacyLevel: 3, text: 'What kind of touch or affection makes you feel most desired and adored?' },
  { category: 'Romance & Intimacy', intimacyLevel: 3, text: 'What is your favorite romantic memory of us in private?' },
  { category: 'Romance & Intimacy', intimacyLevel: 2, text: 'What setting or vibe makes you feel most romantic (candles, seaside, rain, music)?' },
  { category: 'Romance & Intimacy', intimacyLevel: 3, text: 'What is a romantic fantasy or special date idea you have not yet shared with me?' },
  { category: 'Romance & Intimacy', intimacyLevel: 3, text: 'What words or whispers from me give you butterflies even now?' },
  { category: 'Romance & Intimacy', intimacyLevel: 2, text: 'What makes you feel most confident, sensual, and at ease around me?' },
  { category: 'Romance & Intimacy', intimacyLevel: 3, text: 'How can we keep our spontaneous romantic spark thriving in busy everyday life?' },
  { category: 'Romance & Intimacy', intimacyLevel: 2, text: 'What outfit or look of mine drives you crazy in the best possible way?' },
  { category: 'Romance & Intimacy', intimacyLevel: 3, text: 'What does deep intimacy feel like in your mind, heart, and body?' },
  { category: 'Romance & Intimacy', intimacyLevel: 2, text: 'If we had an entire evening with no phones, screens, or clocks, what would we do?' },

  // 9. Long Distance (10 questions)
  { category: 'Long Distance', intimacyLevel: 1, text: 'What is your favorite way to stay connected when we are apart during the day?' },
  { category: 'Long Distance', intimacyLevel: 2, text: 'What is the very first thing you want to do the next moment we hug each other?' },
  { category: 'Long Distance', intimacyLevel: 2, text: 'What item of mine or keepsake gives you comfort when you miss my presence?' },
  { category: 'Long Distance', intimacyLevel: 1, text: 'What is our go-to virtual date idea that always brings smiles?' },
  { category: 'Long Distance', intimacyLevel: 2, text: 'What song, podcast, or playlist makes you feel close to me across the distance?' },
  { category: 'Long Distance', intimacyLevel: 3, text: 'What is the most comforting thought you hold onto on lonely nights?' },
  { category: 'Long Distance', intimacyLevel: 2, text: 'How can I make you feel my presence and love even when we are miles apart?' },
  { category: 'Long Distance', intimacyLevel: 2, text: 'What surprise or sweet gesture from afar has meant the most to you?' },
  { category: 'Long Distance', intimacyLevel: 2, text: 'What countdown or future reunion are you daydreaming about right now?' },
  { category: 'Long Distance', intimacyLevel: 2, text: 'What has being apart taught you about the strength of our connection?' },

  // 10. Random Questions (10 questions)
  { category: 'Random Questions', intimacyLevel: 1, text: 'If you had to live in any fictional universe for one month, which one do you pick?' },
  { category: 'Random Questions', intimacyLevel: 1, text: 'What is the weirdest food combination you secretly enjoy?' },
  { category: 'Random Questions', intimacyLevel: 1, text: 'If you could instantly possess one superpower, would you choose teleportation or time-travel?' },
  { category: 'Random Questions', intimacyLevel: 1, text: 'What board game or card game brings out your most ruthlessly competitive side?' },
  { category: 'Random Questions', intimacyLevel: 1, text: 'If our life together was made into a movie, what genre would it be?' },
  { category: 'Random Questions', intimacyLevel: 2, text: 'What is an unpopular opinion you hold with complete and unapologetic conviction?' },
  { category: 'Random Questions', intimacyLevel: 1, text: 'Would you rather explore the deepest depths of the ocean or an uncharted alien planet?' },
  { category: 'Random Questions', intimacyLevel: 1, text: 'What is the strangest dream you ever remember waking up from?' },
  { category: 'Random Questions', intimacyLevel: 1, text: 'If you could invite any three people in history to our dinner party, who sits with us?' },
  { category: 'Random Questions', intimacyLevel: 2, text: 'What is a small coincidence in life that felt like destiny to you?' },
];

const GAMES_DATA = [
  {
    code: 'WHO_KNOWS',
    title: 'Who Knows Whom Better?',
    description: 'Test how intimately you know each other’s habits, quirks, and favorites in 5 fun rounds.',
    category: 'Trivia & Compatibility',
    icon: 'Brain',
  },
  {
    code: 'MORE_LIKELY',
    title: 'Who Is More Likely To?',
    description: 'Vote secretly on hilarious statements and reveal your answers simultaneously.',
    category: 'Fun & Laughter',
    icon: 'Users',
  },
  {
    code: 'THIS_OR_THAT',
    title: 'This or That',
    description: 'Rapid-fire preferences. See how harmoniously your tastes match or complement each other.',
    category: 'Speed & Discovery',
    icon: 'CheckSquare',
  },
  {
    code: 'WOULD_YOU_RATHER',
    title: 'Would You Rather?',
    description: 'Choose between intriguing, romantic, and hilarious dilemmas and compare thoughts.',
    category: 'Dilemmas',
    icon: 'Shuffle',
  },
  {
    code: 'DRAW_DUEL',
    title: 'Draw Duel',
    description: 'Draw a secret prompt on our shared canvas within the timer, then reveal both masterpieces.',
    category: 'Creative & Artistic',
    icon: 'Palette',
  },
  {
    code: 'LOVE_QUIZ',
    title: 'Love Quiz',
    description: 'A deep-dive milestone quiz about our relationship memories, inside jokes, and special dates.',
    category: 'Relationship Trivia',
    icon: 'Award',
  },
  {
    code: 'WORD_GAME',
    title: 'Word Games & Anagrams',
    description: 'Unscramble romantic words, guess the secret love keyword, and test word associations.',
    category: 'Wordplay',
    icon: 'FileText',
  },
];

const DATE_IDEAS_DATA = [
  // AT_HOME
  { title: 'Living Room Starlight Picnic', category: 'AT_HOME', budget: '$', duration: '2 hours', description: 'Lay out blankets, pillows, fairy lights, and order favorite finger foods while listening to a slow acoustic playlist.' },
  { title: 'Homemade Pasta Night', category: 'AT_HOME', budget: '$$', duration: '2-3 hours', description: 'Put on Italian jazz, make fresh handmade pasta dough together from scratch, and pair with your favorite vintage.' },
  { title: 'Blanket Fort Movie Marathon', category: 'AT_HOME', budget: '$', duration: '3+ hours', description: 'Build an epic nostalgic fort with chairs and sheets, bring popcorn and snacks, and watch comfort movies.' },
  { title: 'Spa & Massage Evening', category: 'AT_HOME', budget: '$', duration: '1.5 hours', description: 'Dim the lighting, light soothing candles, play ambient music, and take turns exchanging relaxing back and foot massages.' },
  { title: 'Couple Bake-Off Challenge', category: 'AT_HOME', budget: '$', duration: '2 hours', description: 'Pick a mystery dessert recipe or cookie decorating theme and see whose creation is tastier and more artistic.' },

  // OUTDOORS
  { title: 'Golden Hour Sunset Hike', category: 'OUTDOORS', budget: '$', duration: '2 hours', description: 'Hike to a scenic viewpoint, bring a thermos of hot cocoa or tea, and watch the sky change colors together.' },
  { title: 'Botanical Garden Stroll', category: 'OUTDOORS', budget: '$', duration: '2 hours', description: 'Wander hand-in-hand through lush greenhouse paths, admiring blooms and peaceful nature.' },
  { title: 'Stargazing with Blankets', category: 'OUTDOORS', budget: '$', duration: '2 hours', description: 'Drive away from city lights, lay in the trunk or on a grassy hill with a star-map app, and count shooting stars.' },
  { title: 'Kayaking or Paddleboarding', category: 'OUTDOORS', budget: '$$', duration: '2-3 hours', description: 'Rent a tandem kayak or paddleboards on a calm lake and enjoy the peaceful water together.' },
  { title: 'Farmer’s Market Morning & Cooking', category: 'OUTDOORS', budget: '$$', duration: '3 hours', description: 'Walk through local morning stalls, pick fresh artisan ingredients and pastries, then cook lunch together.' },

  // ROMANTIC
  { title: 'Candlelight Rooftop Dinner', category: 'ROMANTIC', budget: '$$$', duration: '2.5 hours', description: 'Dress up in your favorite elegant outfits and enjoy panoramic city views over an exquisite multi-course meal.' },
  { title: 'Seaside Sunset Walk', category: 'ROMANTIC', budget: '$', duration: '1.5 hours', description: 'Kick off your shoes, walk along the shoreline water, and talk about your favorite memories together.' },
  { title: 'Jazz Club & Craft Cocktails', category: 'ROMANTIC', budget: '$$$', duration: '3 hours', description: 'Immerse yourselves in sultry live saxophone tunes at a cozy underground jazz lounge.' },
  { title: 'Private Pottery Workshop', category: 'ROMANTIC', budget: '$$$', duration: '2 hours', description: 'Try your hands at the pottery wheel, shaping clay together in a hands-on tactile date.' },
  { title: 'Winery Tour & Tasting', category: 'ROMANTIC', budget: '$$$', duration: '3-4 hours', description: 'Sample hand-crafted regional wines while strolling along rolling vineyard hills in the sunshine.' },

  // BUDGET
  { title: 'Thrift Store Styled Date', category: 'BUDGET', budget: '$', duration: '2 hours', description: 'Give each other a $10 budget to find the funniest or coolest vintage outfit for the other to wear on coffee date.' },
  { title: 'Bookstore Scavenger Hunt', category: 'BUDGET', budget: '$', duration: '1.5 hours', description: 'Browse a quiet independent bookstore, pick out 3 books that remind you of each other, and read passages over lattes.' },
  { title: 'Board Game Café Showdown', category: 'BUDGET', budget: '$', duration: '2 hours', description: 'Pick 2 new games you have never played before and enjoy playful competitive spirits.' },
  { title: 'Art Museum Free Evening', category: 'BUDGET', budget: '$', duration: '2 hours', description: 'Visit an exhibition, choose your favorite artwork in each hall, and explain what emotions it stirs in you.' },
  { title: 'Scenic Drive with Custom Playlist', category: 'BUDGET', budget: '$', duration: '2 hours', description: 'Curate a playlist of 20 songs with special memories, roll the windows down, and drive with no destination.' },

  // FOOD
  { title: 'Tasting Flight Progressive Dinner', category: 'FOOD', budget: '$$$', duration: '3 hours', description: 'Appetizers at one restaurant, main courses at another, and dessert at a third specialty pastry bar.' },
  { title: 'Sushi Rolling Night', category: 'FOOD', budget: '$$', duration: '2 hours', description: 'Buy sushi-grade fish, nori, sticky rice, and make custom rolls, nigiri, and spicy mayo together.' },
  { title: 'Blind Taste Test Challenge', category: 'FOOD', budget: '$', duration: '1 hour', description: 'Blindfold your partner and feed them 8 different treats or fruit bites to see how many they can guess correctly.' },
  { title: 'Street Food Night Market Tour', category: 'FOOD', budget: '$$', duration: '2 hours', description: 'Sample skewers, dumplings, sweet crepes, and seasonal delicacies from local food stalls.' },
  { title: 'Fondue Party for Two', category: 'FOOD', budget: '$$', duration: '1.5 hours', description: 'Warm melted Gruyère cheese with crusty bread followed by warm melted chocolate with strawberries and marshmallows.' },

  // MOVIE
  { title: 'Outdoor Drive-In Theater', category: 'MOVIE', budget: '$$', duration: '2.5 hours', description: 'Back the car into the stall, pack plush pillows, tailgate under the stars, and tune the car radio.' },
  { title: 'Foreign Film & Theme Dinner', category: 'MOVIE', budget: '$', duration: '2.5 hours', description: 'Pick an acclaimed cinema masterpiece from France, Japan, or Italy, paired with authentic cuisine from that region.' },
  { title: 'Childhood Nostalgia Screening', category: 'MOVIE', budget: '$', duration: '2 hours', description: 'Introduce your partner to the movie you watched on repeat when you were ten years old.' },
  { title: 'Oscars Red Carpet Night', category: 'MOVIE', budget: '$', duration: '2.5 hours', description: 'Make fancy mocktails or cocktails, prepare gourmet popcorn with truffle oil, and watch an award-winning feature.' },

  // TRAVEL
  { title: 'Weekend Cabin in the Woods', category: 'TRAVEL', budget: '$$$', duration: 'Weekend', description: 'Rent an intimate cabin with a wood-burning fireplace, unplug from devices, and listen to the forest breeze.' },
  { title: 'Hot Springs Relaxation Getaway', category: 'TRAVEL', budget: '$$$', duration: 'Day Trip', description: 'Soak in natural thermal mineral pools surrounded by mountain scenery.' },
  { title: 'Coastal Lighthouse Road Trip', category: 'TRAVEL', budget: '$$', duration: 'Day Trip', description: 'Follow the coast, stop at historic lighthouses, and eat clam chowder overlooking the ocean.' },
  { title: 'Historic Old Town Bed & Breakfast', category: 'TRAVEL', budget: '$$$', duration: 'Weekend', description: 'Stay in a quaint boutique inn, walk cobblestone streets, and browse antique shops.' },

  // LONG_DISTANCE
  { title: 'Simultaneous Dinner Date on Video', category: 'LONG_DISTANCE', budget: '$', duration: '1.5 hours', description: 'Order the same style of food (or cook the same recipe) and set your phones/laptops as if sitting across a candlelit table.' },
  { title: 'Virtual Museum or Zoo Live Cam', category: 'LONG_DISTANCE', budget: '$', duration: '1 hour', description: 'Explore a 360-degree virtual tour of the Louvre or watch Monterey Bay aquarium sea otters while on the phone.' },
  { title: 'Synchronized Movie & Reaction Watch', category: 'LONG_DISTANCE', budget: '$', duration: '2 hours', description: 'Hit play simultaneously on a comedy or thriller, staying on speaker to hear every laugh and reaction.' },
  { title: 'Care Package Unboxing Live', category: 'LONG_DISTANCE', budget: '$$', duration: '1 hour', description: 'Mail each other a box of handwritten notes, local snacks, and gifts, opening them together on camera.' },
  { title: 'Online Two-Player Cooperative Game', category: 'LONG_DISTANCE', budget: '$', duration: '2 hours', description: 'Play Togetherly games, Draw Duel, or solve online escape rooms together while voice chatting.' },
];

const ACHIEVEMENTS_DATA = [
  { code: 'FIRST_SPARK', title: 'First Spark', icon: 'Flame', description: 'Completed your very first couple activity on Togetherly!', category: 'Milestone', pointsReward: 50 },
  { code: 'FIRST_7_DAYS', title: 'First 7 Days', icon: 'Calendar', description: 'Maintained a beautiful 7-day connection streak together.', category: 'Streaks', pointsReward: 100 },
  { code: 'CONVERSATION_STARTERS', title: 'Conversation Starters', icon: 'MessageCircle', description: 'Answered 10 deep daily questions with each other.', category: 'Communication', pointsReward: 150 },
  { code: 'MEMORY_MAKERS', title: 'Memory Makers', icon: 'Camera', description: 'Captured and shared 5 photo challenge moments.', category: 'Memories', pointsReward: 150 },
  { code: 'PERFECT_MATCH', title: 'Perfect Match', icon: 'HeartHandshake', description: 'Both swiped right on the same dream date idea!', category: 'Date Night', pointsReward: 100 },
  { code: 'CANVAS_ARTISTS', title: 'Canvas Artists', icon: 'Palette', description: 'Created and saved a collaborative drawing together.', category: 'Creativity', pointsReward: 100 },
  { code: 'LOVE_LETTER_DELIVERY', title: 'Love Capsule', icon: 'Mail', description: 'Sent a heartwarming Love Note for your partner to cherish.', category: 'Romance', pointsReward: 100 },
  { code: 'GAME_CHAMPIONS', title: 'Playful Hearts', icon: 'Gamepad2', description: 'Played 5 couple games together on Togetherly.', category: 'Play', pointsReward: 150 },
  { code: '30_DAYS_TOGETHER', title: '30 Days of Connection', icon: 'Sparkles', description: 'Reached an incredible 30-day streak of daily shared moments.', category: 'Streaks', pointsReward: 300 },
  { code: 'SOULMATES_CONNECTED', title: 'Soulmates', icon: 'Crown', description: 'Reached 500 Couple Points through love and shared time.', category: 'Mastery', pointsReward: 500 },
];

async function main() {
  console.log('Seeding Togetherly database...');

  // 1. Categories & Questions
  console.log('Seeding question categories and 100+ questions...');
  for (const cat of QUESTION_CATEGORIES) {
    await prisma.questionCategory.upsert({
      where: { name: cat.name },
      update: { icon: cat.icon, description: cat.description },
      create: { name: cat.name, icon: cat.icon, description: cat.description },
    });
  }

  const allCategories = await prisma.questionCategory.findMany();
  const catMap = new Map(allCategories.map(c => [c.name, c.id]));

  for (let i = 0; i < QUESTIONS_DATA.length; i++) {
    const q = QUESTIONS_DATA[i];
    const categoryId = catMap.get(q.category);
    if (!categoryId) continue;

    // Check if question exists
    const existing = await prisma.question.findFirst({
      where: { text: q.text },
    });

    if (!existing) {
      await prisma.question.create({
        data: {
          text: q.text,
          categoryId,
          intimacyLevel: q.intimacyLevel,
          isDaily: i === 0, // Make the first one daily
        },
      });
    }
  }

  // 2. Games
  console.log('Seeding Couple Games...');
  for (const g of GAMES_DATA) {
    await prisma.game.upsert({
      where: { code: g.code },
      update: { title: g.title, description: g.description, category: g.category, icon: g.icon },
      create: { code: g.code, title: g.title, description: g.description, category: g.category, icon: g.icon },
    });
  }

  // 3. Date Ideas
  console.log('Seeding curated Date Ideas...');
  for (const d of DATE_IDEAS_DATA) {
    const existing = await prisma.dateIdea.findFirst({
      where: { title: d.title },
    });
    if (!existing) {
      await prisma.dateIdea.create({
        data: {
          title: d.title,
          category: d.category,
          budget: d.budget,
          duration: d.duration,
          description: d.description,
        },
      });
    }
  }

  // 4. Achievements
  console.log('Seeding Achievements...');
  for (const a of ACHIEVEMENTS_DATA) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      update: { title: a.title, description: a.description, icon: a.icon, category: a.category, pointsReward: a.pointsReward },
      create: { code: a.code, title: a.title, description: a.description, icon: a.icon, category: a.category, pointsReward: a.pointsReward },
    });
  }

  // 5. Pre-seeded Couple (Only if explicitly enabled via SEED_DEMO_USERS=true)
  if (process.env.SEED_DEMO_USERS === 'true') {
    console.log('Seeding demo couple (Alex & Sarah)...');
    const passwordHash = await bcrypt.hash('password123', 10);

    // Check if relationship exists
    let relationship = await prisma.relationship.findUnique({
      where: { code: 'TOGETH' },
    });

    if (!relationship) {
      const anniversaryDate = new Date('2024-06-15T00:00:00.000Z');
      relationship = await prisma.relationship.create({
        data: {
          code: 'TOGETH',
          anniversaryDate,
          status: 'ACTIVE',
          relationshipType: 'DATING',
          isLongDistance: false,
          streakCount: 14,
          couplePoints: 380,
        },
      });
    }

    const userAlex = await prisma.user.upsert({
      where: { email: 'alex@togetherly.app' },
      update: { relationshipId: relationship.id },
      create: {
        email: 'alex@togetherly.app',
        passwordHash,
        firstName: 'Alex',
        lastName: 'Rivers',
        dateOfBirth: new Date('1996-05-14'),
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        relationshipId: relationship.id,
        profile: {
          create: {
            bio: 'Coffee lover, stargazing enthusiast, and always looking for our next road trip.',
            nickname: 'Al',
            loveLanguage: 'Quality Time',
            interests: JSON.stringify(['Travel', 'Photography', 'Cooking', 'Hiking']),
          },
        },
        settings: {
          create: { theme: 'dark', pushNotifications: true, soundEffects: true },
        },
      },
    });

    const userSarah = await prisma.user.upsert({
      where: { email: 'sarah@togetherly.app' },
      update: { relationshipId: relationship.id },
      create: {
        email: 'sarah@togetherly.app',
        passwordHash,
        firstName: 'Sarah',
        lastName: 'Miller',
        dateOfBirth: new Date('1997-08-22'),
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        relationshipId: relationship.id,
        profile: {
          create: {
            bio: 'Book collector, tea drinker, and fondue chef in training.',
            nickname: 'Sare',
            loveLanguage: 'Words of Affirmation',
            interests: JSON.stringify(['Reading', 'Cooking', 'Art', 'Music']),
          },
        },
        settings: {
          create: { theme: 'dark', pushNotifications: true, soundEffects: true },
        },
      },
    });

    console.log('Demo couple seeded.');
  } else {
    console.log('Production mode: No test users seeded.');
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

