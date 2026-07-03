import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seeds a demo organizer and a ready-to-run quiz so the app can be tested
// end-to-end immediately. Login: demo@quiz.dev / password123
async function main() {
  const email = 'demo@quiz.dev';
  const passwordHash = await bcrypt.hash('password123', 10);

  const organizer = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, role: 'organizer', nickname: 'Демо-организатор' },
  });

  const existing = await prisma.quiz.findFirst({
    where: { ownerId: organizer.id, title: 'Демо-квиз: общая эрудиция' },
  });
  if (existing) {
    console.log('Демо-данные уже созданы. Логин: demo@quiz.dev / password123');
    return;
  }

  await prisma.quiz.create({
    data: {
      ownerId: organizer.id,
      title: 'Демо-квиз: общая эрудиция',
      description: 'Небольшой пример квиза для проверки приложения.',
      category: 'Общая',
      defaultTimePerQuestion: 20,
      speedBonus: true,
      questions: {
        create: [
          {
            type: 'text',
            answerType: 'single',
            text: 'Столица Франции?',
            orderIndex: 0,
            options: {
              create: [
                { text: 'Париж', isCorrect: true, orderIndex: 0 },
                { text: 'Лондон', isCorrect: false, orderIndex: 1 },
                { text: 'Берлин', isCorrect: false, orderIndex: 2 },
                { text: 'Мадрид', isCorrect: false, orderIndex: 3 },
              ],
            },
          },
          {
            type: 'text',
            answerType: 'multiple',
            text: 'Какие из этих языков — языки программирования?',
            orderIndex: 1,
            options: {
              create: [
                { text: 'JavaScript', isCorrect: true, orderIndex: 0 },
                { text: 'Python', isCorrect: true, orderIndex: 1 },
                { text: 'HTML', isCorrect: false, orderIndex: 2 },
                { text: 'Rust', isCorrect: true, orderIndex: 3 },
              ],
            },
          },
          {
            type: 'text',
            answerType: 'single',
            text: 'Сколько будет 7 × 8?',
            timeLimit: 15,
            orderIndex: 2,
            options: {
              create: [
                { text: '54', isCorrect: false, orderIndex: 0 },
                { text: '56', isCorrect: true, orderIndex: 1 },
                { text: '64', isCorrect: false, orderIndex: 2 },
                { text: '48', isCorrect: false, orderIndex: 3 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('Демо-данные созданы. Логин: demo@quiz.dev / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
