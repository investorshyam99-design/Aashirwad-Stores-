(async () => {
    try {
        const res = await fetch('http://localhost:3000/api/gemini/parse-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: "Maggi",
                products: [{ id: "m1", name: "Maggi", price: 10, unit: "packet" }],
                history: [{ role: 'user', text: "Maggi" }],
                cart: [{ id: "m1", quantity: 1 }]
            })
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Body:", text);
    } catch (err) {
        console.error("Error:", err);
    }
})();
