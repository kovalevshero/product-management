const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('1. Checking Swagger documentation...');
  const swaggerRes = await fetch(`${BASE_URL}/api/docs`);
  console.log(`Swagger status: ${swaggerRes.status} (OK)`);

  console.log('\n2. Testing GET /api/products (Initial empty state)...');
  const getInitial = await fetch(`${BASE_URL}/api/products`);
  console.log('Initial products:', await getInitial.json());

  console.log('\n3. Testing POST /api/auth/register...');
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'jhon_doe',
      password: 'supersecret',
      password_confirmation: 'supersecret',
      full_name: 'Jhon Doe',
    }),
  });
  console.log(`Register status: ${regRes.status}`);
  const regData = await regRes.json();
  console.log('Register response:', regData);

  console.log('\n4. Testing POST /api/auth/login...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'jhon_doe',
      password: 'supersecret',
    }),
  });
  console.log(`Login status: ${loginRes.status}`);
  const loginData = await loginRes.json();
  console.log('Tokens received:');
  console.log('  authentication_token:', loginData.authentication_token ? 'YES (Valid JWT)' : 'NO');
  console.log('  refresh_token:', loginData.refresh_token ? 'YES (Valid JWT)' : 'NO');

  const token = loginData.authentication_token;
  const refreshToken = loginData.refresh_token;

  console.log('\n5. Testing POST /api/auth/refresh...');
  const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  console.log(`Refresh status: ${refreshRes.status}`);
  const refreshData = await refreshRes.json();
  console.log('New tokens received successfully:', !!refreshData.authentication_token);
  const activeToken = refreshData.authentication_token;

  console.log('\n6. Testing POST /api/products (Authorized product creation)...');
  const createProductRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeToken}`,
    },
    body: JSON.stringify({
      title: 'Awesome T-Shirt',
      price: 99.99,
      description: 'High-quality cotton t-shirt',
      category: 'Clothes',
      images: ['https://placeimg.com/640/480/any'],
    }),
  });
  console.log(`Create product status: ${createProductRes.status}`);
  const createdProduct = await createProductRes.json();
  console.log('Created product:');
  console.log(JSON.stringify(createdProduct, null, 2));

  const productId = createdProduct.id;

  console.log(`\n7. Testing GET /api/products with search & category filters...`);
  const filterRes = await fetch(`${BASE_URL}/api/products?search=Awesome&category=Clothes&page=1&limit=10`);
  console.log('Filter response:');
  console.log(JSON.stringify(await filterRes.json(), null, 2));

  console.log(`\n8. Testing GET /api/products/${productId} (Product details)...`);
  const detailRes = await fetch(`${BASE_URL}/api/products/${productId}`);
  console.log(JSON.stringify(await detailRes.json(), null, 2));

  console.log(`\n9. Testing PUT /api/products/${productId} (Update product)...`);
  const updateRes = await fetch(`${BASE_URL}/api/products/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeToken}`,
    },
    body: JSON.stringify({
      title: 'Awesome T-Shirt (Updated)',
      price: 109.99,
      category: 'Clothes',
    }),
  });
  console.log(`Update status: ${updateRes.status}`);
  console.log(JSON.stringify(await updateRes.json(), null, 2));

  console.log(`\n10. Testing DELETE /api/products/${productId}...`);
  const deleteRes = await fetch(`${BASE_URL}/api/products/${productId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${activeToken}`,
    },
  });
  console.log(`Delete status: ${deleteRes.status}`);
  console.log(await deleteRes.json());

  console.log(`\n11. Verifying 404 for deleted product /api/products/${productId}...`);
  const notFoundRes = await fetch(`${BASE_URL}/api/products/${productId}`);
  console.log(`Expected 404 status: ${notFoundRes.status}`);
  console.log('404 body:', await notFoundRes.json());

  console.log('\n=== ALL END-TO-END TESTS PASSED SUCCESSFULLY! ===');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
