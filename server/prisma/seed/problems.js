const starter = {
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // read input from stdin, print the answer to stdout\n    return 0;\n}\n',
  python: 'import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    # parse input and print the answer\n\nif __name__ == "__main__":\n    main()\n',
  javascript: "const data = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/);\n// parse input and print the answer with console.log\n"
};

export const problems = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'EASY',
    category: 'ALGORITHMS',
    tags: ['array', 'hash-map'],
    description: `Given an array of \`n\` integers and a target, print the 0-based indices \`i j\` (with \`i < j\`) of the two numbers that add up to the target.

Exactly one valid pair exists.

**Input**
- Line 1: \`n target\`
- Line 2: \`n\` space-separated integers

**Output**
- \`i j\` on one line

**Example**
\`\`\`
Input:
4 9
2 7 11 15
Output:
0 1
\`\`\``,
    constraints: '2 <= n <= 10^5\n-10^9 <= a[i], target <= 10^9',
    reference: `n,t=map(int,input().split())
a=list(map(int,input().split()))
seen={}
for j,x in enumerate(a):
    if t-x in seen:
        print(seen[t-x],j);break
    seen.setdefault(x,j)`,
    tests: [
      { input: '4 9\n2 7 11 15\n', sample: true },
      { input: '3 6\n3 2 4\n', sample: true },
      { input: '2 6\n3 3\n' },
      { input: '5 -8\n-1 -2 -3 -4 -5\n' },
      { input: '6 0\n4 -9 0 7 9 1\n' },
      { input: '7 1000000000\n1 999999999 5 6 7 8 9\n' }
    ]
  },
  {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'EASY',
    category: 'DATA_STRUCTURES',
    tags: ['stack', 'string'],
    description: `Given a string containing only the characters \`()[]{}\`, print \`true\` if every bracket is closed by the same type of bracket in the correct order, otherwise \`false\`.

**Input**
- One line with the string \`s\`

**Output**
- \`true\` or \`false\``,
    constraints: '1 <= |s| <= 10^5',
    reference: `s=input().strip()
st=[];m={')':'(',']':'[','}':'{'}
ok=True
for c in s:
    if c in m:
        if not st or st.pop()!=m[c]: ok=False;break
    else: st.append(c)
print('true' if ok and not st else 'false')`,
    tests: [
      { input: '()[]{}\n', sample: true },
      { input: '(]\n', sample: true },
      { input: '{[()()]}\n' },
      { input: '((((\n' },
      { input: '))\n' },
      { input: '([)]\n' },
      { input: `${'('.repeat(50000)}${')'.repeat(50000)}\n` }
    ]
  },
  {
    slug: 'longest-substring-without-repeating',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'MEDIUM',
    category: 'ALGORITHMS',
    tags: ['sliding-window', 'string'],
    description: `Given a string \`s\` of printable ASCII characters (no spaces), print the length of the longest substring that contains no repeated characters.

**Input**
- One line with \`s\`

**Output**
- A single integer`,
    constraints: '1 <= |s| <= 10^5',
    reference: `s=input().strip()
last={};best=0;start=0
for i,c in enumerate(s):
    if c in last and last[c]>=start: start=last[c]+1
    last[c]=i;best=max(best,i-start+1)
print(best)`,
    tests: [
      { input: 'abcabcbb\n', sample: true },
      { input: 'bbbbb\n', sample: true },
      { input: 'pwwkew\n' },
      { input: 'a\n' },
      { input: 'abba\n' },
      { input: 'dvdf\n' },
      { input: `${'abcdefghijklmnopqrstuvwxyz'.repeat(3000)}\n` }
    ]
  },
  {
    slug: 'number-of-islands',
    title: 'Number of Islands',
    difficulty: 'MEDIUM',
    category: 'ALGORITHMS',
    tags: ['graph', 'bfs', 'dfs', 'grid'],
    description: `Given an \`r x c\` grid of \`1\` (land) and \`0\` (water), print the number of islands. An island is a group of land cells connected horizontally or vertically.

**Input**
- Line 1: \`r c\`
- Next \`r\` lines: a string of \`c\` characters, each \`0\` or \`1\`

**Output**
- A single integer`,
    constraints: '1 <= r, c <= 1000',
    reference: `import sys
from collections import deque
d=sys.stdin.read().split();r,c=int(d[0]),int(d[1]);g=[list(x) for x in d[2:2+r]]
n=0
for i in range(r):
    for j in range(c):
        if g[i][j]=='1':
            n+=1;g[i][j]='0';q=deque([(i,j)])
            while q:
                x,y=q.popleft()
                for a,b in((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                    if 0<=a<r and 0<=b<c and g[a][b]=='1': g[a][b]='0';q.append((a,b))
print(n)`,
    tests: [
      { input: '4 5\n11110\n11010\n11000\n00000\n', sample: true },
      { input: '4 5\n11000\n11000\n00100\n00011\n', sample: true },
      { input: '1 1\n0\n' },
      { input: '3 3\n101\n010\n101\n' },
      { input: `${300} ${300}\n${Array.from({ length: 300 }, (_, i) => (i % 2 ? '0'.repeat(300) : '10'.repeat(150))).join('\n')}\n` }
    ]
  },
  {
    slug: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: 'MEDIUM',
    category: 'ALGORITHMS',
    tags: ['sorting', 'intervals'],
    description: `Given \`n\` closed intervals \`[a, b]\`, merge all overlapping intervals (intervals that touch, like \`[1,4]\` and \`[4,5]\`, also merge) and print the result sorted by start.

**Input**
- Line 1: \`n\`
- Next \`n\` lines: \`a b\`

**Output**
- One merged interval per line: \`a b\``,
    constraints: '1 <= n <= 10^5\n0 <= a <= b <= 10^9',
    reference: `import sys
d=sys.stdin.read().split();n=int(d[0])
iv=sorted((int(d[1+2*i]),int(d[2+2*i])) for i in range(n))
out=[list(iv[0])]
for a,b in iv[1:]:
    if a<=out[-1][1]: out[-1][1]=max(out[-1][1],b)
    else: out.append([a,b])
print('\\n'.join(f'{a} {b}' for a,b in out))`,
    tests: [
      { input: '4\n1 3\n2 6\n8 10\n15 18\n', sample: true },
      { input: '2\n1 4\n4 5\n', sample: true },
      { input: '1\n5 5\n' },
      { input: '3\n1 10\n2 3\n4 5\n' },
      { input: '4\n9 12\n1 2\n3 4\n2 3\n' }
    ]
  },
  {
    slug: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'HARD',
    category: 'ALGORITHMS',
    tags: ['two-pointers', 'array'],
    description: `Given \`n\` non-negative integers representing an elevation map where each bar has width 1, print how much water is trapped after it rains.

**Input**
- Line 1: \`n\`
- Line 2: \`n\` integers

**Output**
- A single integer (may exceed 32 bits)`,
    constraints: '1 <= n <= 2*10^5\n0 <= h[i] <= 10^9',
    reference: `n=int(input());h=list(map(int,input().split()))
l,r=0,n-1;lm=rm=w=0
while l<r:
    if h[l]<h[r]:
        lm=max(lm,h[l]);w+=lm-h[l];l+=1
    else:
        rm=max(rm,h[r]);w+=rm-h[r];r-=1
print(w)`,
    tests: [
      { input: '12\n0 1 0 2 1 0 1 3 2 1 2 1\n', sample: true },
      { input: '6\n4 2 0 3 2 5\n', sample: true },
      { input: '1\n7\n' },
      { input: '3\n5 0 5\n' },
      { input: '5\n1000000000 0 0 0 1000000000\n' },
      { input: `200000\n${Array.from({ length: 200000 }, (_, i) => (i === 0 || i === 199999 ? 1000000000 : (i * 7919) % 1000)).join(' ')}\n` }
    ]
  },
  {
    slug: 'design-url-shortener',
    title: 'Design a URL Shortener',
    difficulty: 'MEDIUM',
    category: 'SYSTEM_DESIGN',
    type: 'WRITTEN',
    tags: ['system-design', 'scalability', 'databases'],
    description: `Design a URL shortening service like bit.ly.

Your written answer should cover:
1. Functional and non-functional requirements (assume 100M new URLs/month, 10:1 read:write ratio)
2. API design
3. Short-code generation strategy and how you avoid collisions
4. Data model and storage choice
5. Scaling reads (caching, replication) and handling hot links
6. Analytics (click counts) without slowing redirects
7. Trade-offs you made and what you would do differently at 10x scale

Use the AI assistant however you like. Reviewers grade both the design and how you used AI to reach it.`
  },
  {
    slug: 'design-rate-limiter',
    title: 'Design a Distributed Rate Limiter',
    difficulty: 'HARD',
    category: 'SYSTEM_DESIGN',
    type: 'WRITTEN',
    tags: ['system-design', 'distributed-systems', 'redis'],
    description: `Design a rate limiter for a public API that runs on 50 stateless gateway nodes.

Cover:
1. Which algorithm(s) you would use (token bucket, sliding window log/counter, ...) and why
2. Where limits are stored and how nodes share state
3. Behaviour under partial failure (e.g. the shared store is down)
4. Per-user, per-IP and per-endpoint limits
5. Response headers and client experience
6. How you would test it`
  },
  {
    slug: 'accessible-modal-dialog',
    title: 'Build an Accessible Modal Dialog',
    difficulty: 'EASY',
    category: 'WEB_DEV',
    type: 'WRITTEN',
    tags: ['accessibility', 'html', 'javascript'],
    description: `Write the HTML, CSS and JavaScript (no frameworks) for a reusable modal dialog component, then explain your choices.

Requirements:
- Opens from a button and closes with a close button, the Escape key, and a backdrop click
- Traps focus inside the dialog while open and restores focus to the trigger on close
- Correct ARIA roles and attributes so screen readers announce it properly
- Prevents background scrolling while open

Paste your code and a short explanation (what you tested, and with which tools).`
  }
];

export { starter };
