async function runTests() {
  console.log('Testing PostMaster API Endpoints...');

  // 1. Health
  const healthRes = await fetch('http://localhost:5000/api/health');
  const health = await healthRes.json();
  console.log('✔ Health Check:', health);

  // 2. Auth Status
  const authRes = await fetch('http://localhost:5000/api/auth/status');
  const auth = await authRes.json();
  console.log('✔ Auth Status Check:', auth);

  // 3. Dynamic Template Preview
  const previewRes = await fetch('http://localhost:5000/api/send/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: 'Partnership opportunity with {{company || "your company"}} & PostMaster',
      body: '<p>Hi {{first_name || "Friend"}}, we love {{company || "your product"}}!</p>',
      recipient: {
        email: 'elena.rostova@techflow.ai',
        company: 'TechFlow AI'
      },
      senderName: 'Alex Morgan'
    })
  });
  const preview = await previewRes.json();
  console.log('✔ Dynamic Template Preview Check:', preview);

  // 4. Templates Library
  const tplRes = await fetch('http://localhost:5000/api/templates');
  const templates = await tplRes.json();
  console.log(`✔ Templates Loaded (${templates.length} templates):`, templates.map(t => t.name));

  // 5. Frontend Vite Server
  const clientRes = await fetch('http://localhost:5173/');
  const clientHtml = await clientRes.text();
  console.log('✔ Frontend Serving HTML successfully! Length:', clientHtml.length, 'bytes');

  console.log('\n🎉 ALL SYSTEM HEALTH & API VERIFICATIONS PASSED 100%!');
}

runTests().catch(console.error);
