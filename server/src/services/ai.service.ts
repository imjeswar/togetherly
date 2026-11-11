interface GenerateQuestionOptions {
  category?: string;
  intimacyLevel?: number;
  mood?: string;
  partnerName?: string;
}

interface GenerateDateOptions {
  budget?: string;
  locationType?: string;
  duration?: string;
  interests?: string[];
  weather?: string;
}

interface GenerateAnniversaryOptions {
  yearsOrDays?: string;
  partnerName?: string;
  tone?: 'romantic' | 'playful' | 'sentimental' | 'poetic';
  sharedMemory?: string;
}

export class AIService {
  private static apiKey = process.env.OPENAI_API_KEY;

  public static async generateQuestion(options: GenerateQuestionOptions) {
    const { category = 'Deep Conversations', intimacyLevel = 2, mood = 'romantic' } = options;

    if (this.apiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are Togetherly AI, an intimate, thoughtful relationship prompt curator. Return a single engaging, insightful conversation question for a couple. Do not give medical or psychological therapy advice. Return JSON with format { "question": "...", "category": "...", "intimacyLevel": 1-3, "rationale": "..." }',
              },
              {
                role: 'user',
                content: `Generate a couple conversation question in the category "${category}" with intimacy level ${intimacyLevel} and mood "${mood}".`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.8,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          const parsed = JSON.parse(data.choices[0].message.content);
          return parsed;
        }
      } catch (err) {
        console.warn('AI API call failed, falling back to curated generator', err);
      }
    }

    // High quality intelligent fallback
    const curatedQuestions: Record<string, string[]> = {
      'Deep Conversations': [
        'What is an unspoken dream or quiet longing you carry that we have not talked about lately?',
        'If you could relive our first 48 hours of meeting, what thoughts were running through your mind then?',
        'What is one boundary or comfort you appreciate most in our shared sacred space?',
        'How do you feel your personal sense of peace has shifted in the last year?',
      ],
      'Love & Affection': [
        'What small detail about the way I speak or look at you makes you smile inside?',
        'What does your soul feel like when we are holding hands in total silence?',
        'What is a love note or whisper you wish you could frame forever?',
        'How do you feel most authentically loved without words?',
      ],
      'Dreams & Future': [
        'If we took a three-month cabin getaway next autumn, what would our daily rhythm look like?',
        'What is a secret bucket list adventure you want us to keep just for the two of us?',
        'Where do you see us waking up on a crisp Sunday morning seven years from now?',
      ],
      'Funny Questions': [
        'If we were in a cooking competition against Gordon Ramsay, which one of us burns the kitchen down first?',
        'What is the funniest face or habit of mine that you secretly mimic when I am not looking?',
        'If our love story was a quirky romantic comedy, what would the movie poster tagline say?',
      ],
    };

    const list = curatedQuestions[category] || curatedQuestions['Deep Conversations'];
    const randomPick = list[Math.floor(Math.random() * list.length)];

    return {
      question: randomPick,
      category,
      intimacyLevel,
      rationale: 'Crafted to spark warm emotional resonance and deeper intimacy.',
    };
  }

  public static async generateDateIdea(options: GenerateDateOptions) {
    const { budget = '$$', locationType = 'AT_HOME', duration = '2 hours', interests = ['Cooking', 'Music'] } = options;

    if (this.apiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are Togetherly Date Architect. Suggest an original, romantic, memorable couple date experience. Return JSON: { "title": "...", "description": "...", "budget": "$|$$|$$$", "duration": "...", "category": "...", "tips": ["...", "..."] }',
              },
              {
                role: 'user',
                content: `Create a date idea for category ${locationType}, budget ${budget}, duration ${duration}, shared interests: ${interests.join(', ')}.`,
              },
            ],
            response_format: { type: 'json_object' },
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          return JSON.parse(data.choices[0].message.content);
        }
      } catch (err) {
        console.warn('AI Date idea failed, using smart engine', err);
      }
    }

    // Dynamic tailored date generator
    const curatedDates = [
      {
        title: 'Boutique French Bistro at Home',
        description: 'Transform your dining table with a linen cloth, candlelight, jazz accordion in the background, making rustic croque-monsieur and chocolate pots de crème.',
        budget,
        duration,
        category: locationType,
        tips: ['Turn off overhead lighting completely', 'Dress in dinner attire even indoors', 'No smartphones at the table'],
      },
      {
        title: 'Secret Skyline Stargazing & Thermos Fondue',
        description: 'Pack a warm blanket, a thermos of melted hot chocolate, fresh strawberries, and find an elevated overlook to watch the city lights flicker into the night sky.',
        budget,
        duration,
        category: locationType,
        tips: ['Bring a portable speaker for acoustic ballads', 'Bring an extra plush scarf to share'],
      },
      {
        title: 'Two-Canvas Cooperative Painting & Sangria',
        description: 'Place two easels or sketchpads side-by-side. Every 10 minutes, swap canvases to continue each other’s brushstrokes until a joint artwork emerges.',
        budget,
        duration,
        category: locationType,
        tips: ['Use warm acrylic tones', 'Sign the bottom corner together with today’s date'],
      },
    ];

    return curatedDates[Math.floor(Math.random() * curatedDates.length)];
  }

  public static async generateAnniversaryLetter(options: GenerateAnniversaryOptions) {
    const { partnerName = 'my love', yearsOrDays = 'another year', tone = 'romantic', sharedMemory = 'our travels' } = options;

    if (this.apiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are a poet and heartfelt love letter artisan for Togetherly. Write a brief, breathtaking, deeply sincere couple love note or anniversary tribute. Return JSON: { "title": "...", "letter": "..." }',
              },
              {
                role: 'user',
                content: `Write a love letter for ${partnerName} celebrating ${yearsOrDays}. Tone: ${tone}. Special memory reference: ${sharedMemory}.`,
              },
            ],
            response_format: { type: 'json_object' },
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          return JSON.parse(data.choices[0].message.content);
        }
      } catch (err) {
        console.warn('AI Letter generation failed, using curated template', err);
      }
    }

    return {
      title: `To ${partnerName}, with all my devotion`,
      letter: `Dearest ${partnerName},\n\nLooking back over ${yearsOrDays}, I am filled with an overwhelming sense of gratitude. Every quiet morning we shared, every burst of laughter that echoed through our home, and memories like ${sharedMemory} have woven an unbreakable tapestry.\n\nYou are not just the one I love; you are my greatest adventure, my quiet harbor in every storm, and the smile that makes every ordinary day feel extraordinary.\n\nHere is to every sunrise yet to come, hand in hand with you.\n\nForever yours,\nTogetherly Heart`,
    };
  }
}
