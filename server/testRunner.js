import vm from 'vm';

export function runTests(code, lesson) {
  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    outputs.push(args.map(a => 
      typeof a === 'object' ? JSON.stringify(a) : String(a)
    ).join(' '));
  };

  try {
    const script = new vm.Script(code);
    const context = vm.createContext({
      console: { log: (...args) => outputs.push(args.map(a => 
        typeof a === 'object' ? JSON.stringify(a) : String(a)
      ).join(' ')) },
      setTimeout, setInterval, clearTimeout, clearInterval
    });
    script.runInContext(context, { timeout: 3000 });
  } catch (err) {
    console.log = originalLog;
    return {
      passed: false,
      error: err.message,
      output: outputs.join('\n')
    };
  }

  console.log = originalLog;
  const actual = outputs.join('\n').trim();

  const normalize = (s) => s.replace(/\s+/g, ' ').trim();

  for (const tc of lesson.testCases) {
    const expected = tc.expected.trim();
    const normalizedActual = normalize(actual);
    const normalizedExpected = normalize(expected);
    
    if (normalizedActual !== normalizedExpected) {
      return {
        passed: false,
        expected: expected,
        actual: actual,
        output: actual,
        hint: tc.description
      };
    }
  }

  return {
    passed: true,
    output: actual,
    message: 'All tests passed! Well done!'
  };
}
