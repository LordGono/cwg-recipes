import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user
  const passwordHash = await bcrypt.hash('Password1', 10);
  const user = await prisma.user.upsert({
    where: { email: 'test@cwg.local' },
    update: {},
    create: {
      username: 'testchef',
      email: 'test@cwg.local',
      passwordHash,
      isAdmin: true,
    },
  });
  console.log(`✅ User: ${user.username} / Password1`);

  // Tags
  const tagNames = ['dinner', 'baking', 'quick', 'vegetarian'];
  const tags: Record<string, string> = {};
  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    tags[name] = tag.id;
  }

  // Recipe 1 — Chocolate Chip Cookies (good for scaling fractions)
  const cookies = await prisma.recipe.upsert({
    where: { id: 'seed-recipe-001' },
    update: {},
    create: {
      id: 'seed-recipe-001',
      name: 'Chocolate Chip Cookies',
      description: 'Classic crispy-edged, chewy-centered cookies. Scale up for a crowd.',
      prepTime: 15,
      cookTime: 12,
      totalTime: 27,
      servings: 24,
      createdBy: user.id,
      ingredients: [
        { amount: '2 1/4 cups', item: 'all-purpose flour' },
        { amount: '1 tsp', item: 'baking soda' },
        { amount: '1 tsp', item: 'salt' },
        { amount: '1 cup', item: 'butter, softened' },
        { amount: '3/4 cup', item: 'granulated sugar' },
        { amount: '3/4 cup', item: 'packed brown sugar' },
        { amount: '2', item: 'large eggs' },
        { amount: '2 tsp', item: 'vanilla extract' },
        { amount: '2 cups', item: 'chocolate chips' },
        { amount: '1/2 cup', item: 'chopped walnuts (optional)' },
      ],
      instructions: [
        { step: 1, text: 'Preheat oven to 375°F (190°C). Line baking sheets with parchment.' },
        { step: 2, text: 'Whisk flour, baking soda, and salt together in a bowl. Set aside.' },
        { step: 3, text: 'Beat butter and both sugars until light and fluffy, about 3 minutes.' },
        { step: 4, text: 'Add eggs one at a time, then vanilla. Mix until combined.' },
        { step: 5, text: 'Gradually add the flour mixture, mixing on low until just combined.' },
        { step: 6, text: 'Fold in chocolate chips and walnuts if using.' },
        { step: 7, text: 'Drop rounded tablespoons onto prepared sheets, 2 inches apart.' },
        { step: 8, text: 'Bake 9–11 minutes until edges are golden. Cool on sheet 5 minutes before transferring.' },
      ],
    },
  });

  await prisma.recipeTag.upsert({
    where: { recipeId_tagId: { recipeId: cookies.id, tagId: tags['baking'] } },
    update: {},
    create: { recipeId: cookies.id, tagId: tags['baking'] },
  });

  // Recipe 2 — Pasta Carbonara (scaling fractions + "to taste")
  const carbonara = await prisma.recipe.upsert({
    where: { id: 'seed-recipe-002' },
    update: {},
    create: {
      id: 'seed-recipe-002',
      name: 'Pasta Carbonara',
      description: 'A Roman classic. Rich, creamy, no cream required.',
      prepTime: 10,
      cookTime: 20,
      totalTime: 30,
      servings: 4,
      createdBy: user.id,
      ingredients: [
        { amount: '400 g', item: 'spaghetti or rigatoni' },
        { amount: '200 g', item: 'guanciale or pancetta, diced' },
        { amount: '4', item: 'large egg yolks' },
        { amount: '1', item: 'whole egg' },
        { amount: '1 cup', item: 'Pecorino Romano, finely grated' },
        { amount: '1/2 cup', item: 'Parmigiano-Reggiano, grated' },
        { amount: '1 tsp', item: 'coarsely ground black pepper' },
        { amount: 'to taste', item: 'salt' },
      ],
      instructions: [
        { step: 1, text: 'Bring a large pot of salted water to a boil.' },
        { step: 2, text: 'Cook guanciale in a skillet over medium heat until crispy. Remove from heat and set aside with its rendered fat.' },
        { step: 3, text: 'Whisk egg yolks, whole egg, Pecorino, Parmigiano, and pepper in a bowl.' },
        { step: 4, text: 'Cook pasta until al dente. Reserve 1 cup pasta water before draining.' },
        { step: 5, text: 'Add hot pasta to the skillet with guanciale off heat. Toss quickly.' },
        { step: 6, text: 'Add egg mixture and a splash of pasta water. Toss vigorously until creamy. Add more water as needed.' },
        { step: 7, text: 'Serve immediately with extra cheese and pepper.' },
      ],
    },
  });

  await prisma.recipeTag.upsert({
    where: { recipeId_tagId: { recipeId: carbonara.id, tagId: tags['dinner'] } },
    update: {},
    create: { recipeId: carbonara.id, tagId: tags['dinner'] },
  });

  // Recipe 3 — Quick Guacamole (pinned, small servings for scaling down demo)
  const guac = await prisma.recipe.upsert({
    where: { id: 'seed-recipe-003' },
    update: {},
    create: {
      id: 'seed-recipe-003',
      name: 'Classic Guacamole',
      description: 'Ready in 5 minutes. Scale up for a party.',
      prepTime: 5,
      cookTime: 0,
      totalTime: 5,
      servings: 2,
      isPinned: true,
      createdBy: user.id,
      ingredients: [
        { amount: '2', item: 'ripe avocados' },
        { amount: '1/4 cup', item: 'red onion, finely diced' },
        { amount: '1', item: 'jalapeño, seeded and minced' },
        { amount: '2 tbsp', item: 'fresh cilantro, chopped' },
        { amount: '1 1/2 tbsp', item: 'fresh lime juice' },
        { amount: '1/2 tsp', item: 'kosher salt' },
        { amount: 'pinch', item: 'cumin (optional)' },
      ],
      instructions: [
        { step: 1, text: 'Halve and pit the avocados. Scoop flesh into a bowl.' },
        { step: 2, text: 'Mash with a fork to your preferred texture — chunky or smooth.' },
        { step: 3, text: 'Fold in onion, jalapeño, cilantro, lime juice, and salt.' },
        { step: 4, text: 'Taste and adjust seasoning. Serve immediately.' },
      ],
    },
  });

  await prisma.recipeTag.upsert({
    where: { recipeId_tagId: { recipeId: guac.id, tagId: tags['quick'] } },
    update: {},
    create: { recipeId: guac.id, tagId: tags['quick'] },
  });
  await prisma.recipeTag.upsert({
    where: { recipeId_tagId: { recipeId: guac.id, tagId: tags['vegetarian'] } },
    update: {},
    create: { recipeId: guac.id, tagId: tags['vegetarian'] },
  });

  console.log(`✅ Recipes: ${cookies.name}, ${carbonara.name}, ${guac.name}`);
  console.log('\n🎉 Done! Login: test@cwg.local / Password1');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
