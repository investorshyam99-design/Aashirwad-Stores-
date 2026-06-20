import fs from 'fs';
fetch('http://localhost:3000/api/gemini/parse-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: '2 packet maggi',
    products: [],
    history: [],
    cart: []
  })
}).then(res => res.json()).then(console.log).catch(console.error);
