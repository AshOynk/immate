export const lessons = [
  {
    id: 1,
    title: 'Variables & Data Types',
    description: 'Store information and give it a name — your first superpower!',
    difficulty: 'beginner',
    explanation: `Think of variables like labeled boxes. You put something inside, give it a name, and you can find it later. That's it! No magic, just organization.

In JavaScript, we use \`let\` to create a variable. The name you choose helps you remember what's inside — like naming a box "favoriteColor" instead of "stuff".

You can store different types of things: words (strings), numbers, true/false values, and more. Don't worry about memorizing — you'll get the hang of it as you go!`,
    starterCode: `// Create a variable called greeting and assign it the value "Hello, coder!"
let greeting = 

// Create a variable called score and assign it the number 100
let score = 

// Don't change these — they check your work!
console.log(greeting);
console.log(score);`,
    solutionCode: `let greeting = "Hello, coder!";
let score = 100;
console.log(greeting);
console.log(score);`,
    testCases: [
      { input: '', expected: 'Hello, coder!\n100', description: 'Output matches expected' }
    ]
  },
  {
    id: 2,
    title: 'Functions Basics',
    description: 'Reuse your code like a pro — write once, run many times!',
    difficulty: 'beginner',
    explanation: `Functions are like recipes. You write the steps once, then whenever you need that same result, you just "run" the recipe. No rewriting!

A function has a name, can take inputs (called parameters), and can return a result. The syntax might look a bit new, but the idea is simple: \`function sayHi() { ... }\` means "when someone calls sayHi, do what's inside the braces."

Start small. Your first function might just say hello. That's perfect — you're building the skill!`,
    starterCode: `// Write a function called greet that returns "Hello!"
// Hint: use return "Hello!"
function greet() {
  // Your code here
}

// Don't change this — it checks your work!
console.log(greet());`,
    solutionCode: `function greet() {
  return "Hello!";
}
console.log(greet());`,
    testCases: [
      { input: '', expected: 'Hello!', description: 'Function returns Hello!' }
    ]
  },
  {
    id: 3,
    title: 'Loops',
    description: 'Repeat tasks without repeating yourself — automation unlocked!',
    difficulty: 'beginner',
    explanation: `Ever had to do the same thing 10 times? Loops do that for you. They're one of the most practical tools in coding.

A \`for\` loop says: "Start here, do this, update, and repeat until we're done." The classic pattern: start at 0, go up to a number, add 1 each time. That's how you count!

You'll use loops everywhere — printing items, processing lists, games. This lesson gets you started. You've got this!`,
    starterCode: `// Use a for loop to print numbers 1, 2, 3 on separate lines
// Hint: for (let i = 1; i <= 3; i++) { ... }
for () {
  console.log();
}`,
    solutionCode: `for (let i = 1; i <= 3; i++) {
  console.log(i);
}`,
    testCases: [
      { input: '', expected: '1\n2\n3', description: 'Prints 1, 2, 3 on separate lines' }
    ]
  },
  {
    id: 4,
    title: 'Conditionals',
    description: 'Make decisions in code — if this, then that!',
    difficulty: 'beginner',
    explanation: `Real programs make choices. "If the user is logged in, show the dashboard. Otherwise, show the login form." That's a conditional!

\`if\` and \`else\` are your friends. They let your code branch — take different paths based on what's true. No pressure to get it perfect; just practice the pattern.

Comparison operators like \`>\`, \`<\`, \`===\` help you ask questions. "Is x greater than 5?" The answer determines what happens next. Simple as that!`,
    starterCode: `// Write code that checks: if score is 100 or more, print "You win!"
// Otherwise print "Keep going!"
let score = 100;

if () {
  console.log("You win!");
} else {
  console.log("Keep going!");
}`,
    solutionCode: `let score = 100;
if (score >= 100) {
  console.log("You win!");
} else {
  console.log("Keep going!");
}`,
    testCases: [
      { input: '', expected: 'You win!', description: 'Prints You win! when score >= 100' }
    ]
  },
  {
    id: 5,
    title: 'Simple Array Operations',
    description: 'Work with lists of data — collections made easy!',
    difficulty: 'beginner',
    explanation: `Arrays are lists. A shopping list, a list of names, a list of scores — same idea. You put items in order, and you can access them by position (0, 1, 2... yes, we start at 0!).

You can add items with \`.push()\`, get the length with \`.length\`, and loop through everything. Arrays are everywhere in real code, and you're about to use them. Nice!`,
    starterCode: `// Create an array called fruits with "apple" and "banana"
let fruits = 

// Add "orange" to the end using .push()
fruits.

// Print the array (don't change this line)
console.log(fruits);`,
    solutionCode: `let fruits = ["apple", "banana"];
fruits.push("orange");
console.log(fruits);`,
    testCases: [
      { input: '', expected: '["apple","banana","orange"]', description: 'Array has apple, banana, orange' }
    ]
  }
];
