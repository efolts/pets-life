import amazonPaapi from 'amazon-paapi';
import dotenv from 'dotenv';

dotenv.config();

const commonParameters = {
  AccessKey: process.env.AMAZON_ACCESS_KEY,
  SecretKey: process.env.AMAZON_SECRET_KEY,
  PartnerTag: 'petslife-20',
  PartnerType: 'Associates',
  Marketplace: 'www.amazon.com'
};

async function testPAAPI() {
  console.log('Testing Amazon PA-API credentials...\n');
  console.log('Access Key:', process.env.AMAZON_ACCESS_KEY?.substring(0, 8) + '...');
  console.log('Partner Tag:', 'petslife-20');
  console.log('Marketplace:', 'www.amazon.com\n');

  try {
    // Test 1: Simple product lookup by ASIN
    console.log('Test 1: Looking up KONG Classic Dog Toy (B0002AR0II)...');

    const requestParameters = {
      ItemIds: ['B0002AR0II'],
      Resources: [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'ItemInfo.Features',
        'Offers.Listings.Price'
      ]
    };

    const data = await amazonPaapi.GetItems(commonParameters, requestParameters);

    if (data?.ItemsResult?.Items?.length > 0) {
      const item = data.ItemsResult.Items[0];
      console.log('✓ PA-API is WORKING!');
      console.log('\nProduct found:');
      console.log('  Title:', item.ItemInfo?.Title?.DisplayValue);
      console.log('  ASIN:', item.ASIN);
      console.log('  Image:', item.Images?.Primary?.Large?.URL);
      console.log('\n✓ Your PA-API access is active and working!');
      console.log('✓ You can use PA-API for trending products scraping.');
      return true;
    }
  } catch (error) {
    console.log('✗ PA-API Error:', error.message);

    if (error.message?.includes('AccountNotActive') || error.message?.includes('InvalidAssociateTag')) {
      console.log('\n⚠ Your PA-API account is NOT active.');
      console.log('⚠ Reason: Need 10+ sales in last 30 days OR ship at least 3 items in 180 days.');
      console.log('\nFallback solution: Use web scraping for trending products instead.');
      return false;
    }

    if (error.message?.includes('InvalidSignature') || error.message?.includes('SignatureDoesNotMatch')) {
      console.log('\n✗ Credentials are invalid or expired.');
      console.log('Check your Amazon Associates account for correct keys.');
      return false;
    }

    console.log('\nFull error:', error);
    return false;
  }
}

testPAAPI().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
