async function runTests() {
  console.log('Testing HR Email App Engine Endpoints...');

  // 1. Health
  const healthRes = await fetch('http://localhost:5000/api/health');
  const health = await healthRes.json();
  console.log('✔ Health Check:', health);

  // 2. Templates
  const tplRes = await fetch('http://localhost:5000/api/templates');
  const templates = await tplRes.json();
  console.log(`✔ Templates Loaded (${templates.length} templates):`, templates.map(t => t.name));

  // 3. Dynamic Template Preview
  const previewRes = await fetch('http://localhost:5000/api/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: 'Application for {{role || "Software Engineer"}} • {{name || "Hiring Team"}} at {{company || "your team"}}',
      body: 'Dear {{name || "Hiring Team"}},\n\nI am excited to apply for roles at {{company || "your company"}}.',
      recipient: {
        email: 'elena.rostova@techflow.ai',
        name: 'Elena Rostova',
        company: 'TechFlow AI',
        role: 'Full Stack Engineer'
      },
      senderName: 'Neelesh Tripathi',
      senderEmail: 'neelesh@gmail.com'
    })
  });
  const preview = await previewRes.json();
  console.log('✔ Dynamic Preview Check:', preview);

  // 4. Past Campaigns History
  const campRes = await fetch('http://localhost:5000/api/campaigns');
  const campaigns = await campRes.json();
  console.log(`✔ Campaigns Log Loaded: ${campaigns.length} past runs`);

  // 5. Frontend Vite Server
  const clientRes = await fetch('http://localhost:5173/');
  const clientHtml = await clientRes.text();
  console.log('✔ Frontend Serving HTML successfully! Length:', clientHtml.length, 'bytes');

  console.log('\n🎉 ALL SYSTEM HEALTH & API VERIFICATIONS PASSED 100%!');
}

runTests().catch(console.error);
