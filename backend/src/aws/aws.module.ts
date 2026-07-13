import { Module, Global } from '@nestjs/common';
import { DynamoDBService } from './dynamo-db.service';

@Global()
@Module({
  providers: [DynamoDBService],
  exports: [DynamoDBService],
})
export class AwsModule {}
