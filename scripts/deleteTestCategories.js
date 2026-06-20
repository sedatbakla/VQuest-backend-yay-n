const API_BASE = 'https://vquest-backend-api.onrender.com/api';

async function main() {
  try {
    // 1. Login
    console.log('Logging in as admin...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@vquest.com', password: 'admin123' })
    });
    
    if (!loginRes.ok) {
      const err = await loginRes.text();
      throw new Error(`Login failed: ${loginRes.status} ${err}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login successful. Fetching current categories...');
    
    // 2. Fetch all categories
    const catRes = await fetch(`${API_BASE}/categories`);
    
    if (!catRes.ok) throw new Error(`Fetch categories failed: ${await catRes.text()}`);
    const categories = await catRes.json();
    console.log(`Fetched ${categories.length} total categories from production API.`);
    
    // 3. Find test categories
    let deletedCount = 0;
    const idsToDelete = categories.filter(c => {
      const name = (c.name || '').toLowerCase().trim();
      return name.includes('test') || 
             name.includes('güncel') || 
             name.includes('deneme') ||
             name === 'a' || 
             name === 'asd' || 
             name === 'qwe';
    }).map(c => c._id || c.id || c.mongoId);
    
    console.log(`Found ${idsToDelete.length} test categories to delete.`);
    
    // 4. Delete test categories
    for (const id of idsToDelete) {
      if (!id) continue;
      const delRes = await fetch(`${API_BASE}/admin/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (delRes.ok || delRes.status === 204) {
        console.log(`Deleted category ${id}`);
        deletedCount++;
      } else {
        const err = await delRes.text();
        console.log(`Failed to delete category ${id}: ${delRes.status} ${err}`);
      }
    }
    
    console.log(`Successfully deleted ${deletedCount} categories.`);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
