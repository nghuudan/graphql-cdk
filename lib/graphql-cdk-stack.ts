import * as cdk from '@aws-cdk/core';
import * as appsync from '@aws-cdk/aws-appsync';
import * as db from '@aws-cdk/aws-dynamodb';
import { join } from 'path';

export class GraphqlCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new appsync.GraphqlApi(this, 'Api', {
      name: 'Memo',
      schema: appsync.Schema.fromAsset(join(__dirname, 'schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
        },
      },
      xrayEnabled: true,
    });

    const memoTable = new db.Table(this, 'MemoTable', {
      partitionKey: {
        name: 'id',
        type: db.AttributeType.STRING,
      },
    });

    const memoDS = api.addDynamoDbDataSource('memoDataSource', memoTable);

    memoDS.createResolver({
      typeName: 'Query',
      fieldName: 'allMemos',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });

    memoDS.createResolver({
      typeName: 'Query',
      fieldName: 'memo',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem('id', 'memoId'),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem()
    });

    memoDS.createResolver({
      typeName: 'Mutation',
      fieldName: 'addMemo',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
        appsync.PrimaryKey.partition('id').auto(),
        appsync.Values.projecting('input'),
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    memoDS.createResolver({
      typeName: 'Mutation',
      fieldName: 'deleteMemo',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbDeleteItem('id', 'memoId'),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem()
    });

    memoDS.createResolver({
      typeName: 'Mutation',
      fieldName: 'updateMemo',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
        appsync.PrimaryKey.partition('id').is('memoId'),
        appsync.Values.projecting('input'),
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem()
    });
  }
}
