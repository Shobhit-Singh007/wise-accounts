const { plainToInstance, Type } = require('class-transformer');

class CustomerDto {
  name;
  Name;
  phone;
}

class RecordsDto {
  @Type(() => CustomerDto)
  records;
}

const body = {
  records: [
    { Name: 'Manoj', 'Customer Name': 'Manoj', 'Debit(-)': '0', 'Credit(+)': '14000', Debit: '0', Credit: '14000', Date: '19 Jul', Details: '-' }
  ]
};

const instance = plainToInstance(RecordsDto, body);
const record = instance.records[0];
console.log('Record keys:', Object.keys(record));
console.log('Has Debit:', 'Debit' in record, record.Debit);
console.log('Has Credit:', 'Credit' in record, record.Credit);
console.log('Has Customer Name:', 'Customer Name' in record);
console.log('Has Date:', 'Date' in record);
console.log('Has Credit(+):', 'Credit(+)' in record);
