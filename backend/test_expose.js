const { plainToInstance } = require('class-transformer');

class TestDto {
  name;
  Name;
  phone;
}

const source = { Name: 'Manoj', 'Customer Name': 'Manoj', 'Debit(-)': '0', 'Credit(+)': '14000', Debit: '0', Credit: '14000', Date: '19 Jul', Details: '-' };

const defaultInstance = plainToInstance(TestDto, source);
console.log('Default strategy keys:', Object.keys(defaultInstance));

const exposeAllInstance = plainToInstance(TestDto, source, { strategy: 'exposeAll' });
console.log('exposeAll strategy keys:', Object.keys(exposeAllInstance));
console.log('Has Debit:', 'Debit' in exposeAllInstance, exposeAllInstance.Debit);
console.log('Has Credit:', 'Credit' in exposeAllInstance, exposeAllInstance.Credit);
console.log('Has Customer Name:', 'Customer Name' in exposeAllInstance);
console.log('Has Date:', 'Date' in exposeAllInstance);
