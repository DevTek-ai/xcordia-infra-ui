import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as cf from '@aws-cdk/aws-cloudfront';
import { Duration } from '@aws-cdk/aws-events/node_modules/@aws-cdk/core';
import { OriginProtocolPolicy } from '@aws-cdk/aws-cloudfront';

const config = require('config');

export class InfraStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //-----------OAI-------------
    
    const oai: cf.OriginAccessIdentity = new cf.OriginAccessIdentity(this, 's3-access-oai');



    //-----------S3 BUCKET UI SHOP-------------
    const s3Bucket_ui_shop_files:s3.Bucket = new s3.Bucket(this, `${config.get('PROJECT_NAME')}-bucket-ui-shop`, {
      bucketName: `${config.get('PROJECT_NAME')}-bucket-${config.get('ENVIRONMENT')}-shop`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      websiteIndexDocument: config.get('WEBSITE.WEBSITE_INDEX_PAGE'),
      websiteErrorDocument: config.get('WEBSITE.WEBSITE_ERROR_PAGE')
    });    
    new cdk.CfnOutput(this, 'ui-shop-bucket', { value: s3Bucket_ui_shop_files.bucketName });
    s3Bucket_ui_shop_files.grantReadWrite(oai);


    //-----------S3 BUCKET UI ADMIN-------------
    const s3Bucket_ui_admin_files: s3.Bucket = new s3.Bucket(this, `${config.get('PROJECT_NAME')}-bucket-ui-admin`, {
      bucketName: `${config.get('PROJECT_NAME')}-bucket-${config.get('ENVIRONMENT')}-admin`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      websiteIndexDocument: config.get('WEBSITE.WEBSITE_INDEX_PAGE'),
      websiteErrorDocument: config.get('WEBSITE.WEBSITE_ERROR_PAGE')
    });
    new cdk.CfnOutput(this, 'ui-admin-bucket', { value: s3Bucket_ui_admin_files.bucketName });
    s3Bucket_ui_admin_files.grantReadWrite(oai);



    //-----------S3 BUCKET VERSIONING-------------
    // var versioning_bucket_name = `${config.get('PROJECT_NAME')}-versioning`
    // if (config.get('ENVIRONMENT') == 'dev' || config.get('ENVIRONMENT') == 'stg') {
    //   versioning_bucket_name = `${versioning_bucket_name}-nonprod`
    // }

    // const s3Bucket_versioning: s3.Bucket = new s3.Bucket(this, `${config.get('PROJECT_NAME')}-bucket-versioning`, {
    //   bucketName: versioning_bucket_name,
    //   publicReadAccess: false,
    //   blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL      
    // });

    // s3Bucket_versioning.grantReadWrite(oai);
    // new cdk.CfnOutput(this, 'ui-bucket-versioning', { value: s3Bucket_versioning.bucketName });


    //-----------S3 BUCKET DOCUMENTS-------------
    const s3Bucket_documents: s3.Bucket = new s3.Bucket(this, `${config.get('PROJECT_NAME')}-documents-${config.get('ENVIRONMENT')}`, {
      bucketName: `${config.get('PROJECT_NAME')}-documents-${config.get('ENVIRONMENT')}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });
    
    s3Bucket_documents.grantReadWrite(oai);
    new cdk.CfnOutput(this, 'ui-bucket-documents', { value: s3Bucket_documents.bucketName });

      
    
    //-----------CLOUDFRONT DISTRIBUTION SHOP-------------    
    const distribution_shop: cf.CloudFrontWebDistribution = new cf.CloudFrontWebDistribution(this, `cloudfront`, {
      priceClass: cf.PriceClass.PRICE_CLASS_ALL,
      comment: 'CDN to host frontend on S3',
      httpVersion:cf.HttpVersion.HTTP2,
      viewerProtocolPolicy:cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: s3Bucket_ui_shop_files,
            originAccessIdentity: oai
          },
          behaviors: [
            { 
              isDefaultBehavior: true, 
              allowedMethods: cf.CloudFrontAllowedMethods.ALL,
              compress:true,
              defaultTtl: Duration.minutes(5),
              minTtl: Duration.minutes(5),
              maxTtl: Duration.minutes(5)

            }
          ]
        },
        {//API LB
          customOriginSource: {
            domainName: config.get('API_LB_DNS'),
            httpPort: 8080,
            originProtocolPolicy: OriginProtocolPolicy.HTTP_ONLY
          },
          behaviors: [
            {
              pathPattern: "/api/*",
              isDefaultBehavior: false,
              allowedMethods: cf.CloudFrontAllowedMethods.ALL,
              compress: true,
              defaultTtl: Duration.minutes(0),
              minTtl: Duration.minutes(0),
              maxTtl: Duration.minutes(0)
            },
            {
              pathPattern: "/management/*",
              isDefaultBehavior: false,
              allowedMethods: cf.CloudFrontAllowedMethods.ALL,
              compress: true,
              defaultTtl: Duration.minutes(0),
              minTtl: Duration.minutes(0),
              maxTtl: Duration.minutes(0)
            }
          ]
        },
        {//DOCUMENTS
          s3OriginSource: {
            s3BucketSource: s3Bucket_documents,
            originAccessIdentity: oai
          },
          behaviors: [
            {
              isDefaultBehavior: false,
              allowedMethods: cf.CloudFrontAllowedMethods.ALL,
              compress: true,
              defaultTtl: Duration.minutes(0),
              minTtl: Duration.minutes(0),
              maxTtl: Duration.minutes(0)
            }
          ]
        }
      ],
      defaultRootObject: 'medicine.html',
      errorConfigurations: [
        {
          errorCode: 403,
          errorCachingMinTtl: 10,
          responseCode: 200,
          responsePagePath: '/medicine.html'
        },
        {
          errorCode: 404,
          errorCachingMinTtl: 10,
          responseCode: 200,
          responsePagePath: '/medicine.html'
        }
      ],
      aliasConfiguration: {
        names: [config.get('SHOP_URL')],
        acmCertRef: config.get('ACM_CERT_ARN')
      }
    });
    new cdk.CfnOutput(this, 'Distribution URL SHOP', {value: distribution_shop.distributionDomainName});


    //-----------CLOUDFRONT DISTRIBUTION ADMIN-------------    
    const distribution_admin: cf.CloudFrontWebDistribution = new cf.CloudFrontWebDistribution(this, `cloudfront-admin`, {
      priceClass: cf.PriceClass.PRICE_CLASS_ALL,
      comment: 'Admin FE hosting',
      httpVersion: cf.HttpVersion.HTTP2,
      viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      originConfigs: [
        {// /*
          s3OriginSource: {
            s3BucketSource: s3Bucket_ui_admin_files,
            originAccessIdentity: oai
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              allowedMethods: cf.CloudFrontAllowedMethods.ALL,
              compress: true,
              defaultTtl: Duration.minutes(5),
              minTtl: Duration.minutes(5),
              maxTtl: Duration.minutes(5)

            }
          ]
        },
        {//API LB
          customOriginSource: {
            domainName: config.get('API_LB_DNS'),
            httpPort: 8080,
            originProtocolPolicy: OriginProtocolPolicy.HTTP_ONLY
          },
          behaviors: [
            {
              pathPattern: "/api/*",
              isDefaultBehavior: false,
              allowedMethods: cf.CloudFrontAllowedMethods.ALL,
              compress: true,
              defaultTtl: Duration.minutes(0),
              minTtl: Duration.minutes(0),
              maxTtl: Duration.minutes(0)
            },
            {
              pathPattern: "/management/*",
              isDefaultBehavior: false,
              allowedMethods: cf.CloudFrontAllowedMethods.ALL,
              compress: true,
              defaultTtl: Duration.minutes(0),
              minTtl: Duration.minutes(0),
              maxTtl: Duration.minutes(0)
            }
          ]
        },
        {//DOCUMENTS
          s3OriginSource: {
            s3BucketSource: s3Bucket_documents,
            originAccessIdentity: oai
          },
          behaviors: [
            {
              isDefaultBehavior: false,
              allowedMethods: cf.CloudFrontAllowedMethods.ALL,
              compress: true,
              defaultTtl: Duration.minutes(0),
              minTtl: Duration.minutes(0),
              maxTtl: Duration.minutes(0)
            }
          ]
        }
      ],
      defaultRootObject: 'index.html',
      errorConfigurations: [
        {
          errorCode: 403,
          errorCachingMinTtl: 10,
          responseCode: 200,
          responsePagePath: '/index.html'
        },
        {
          errorCode: 404,
          errorCachingMinTtl: 10,
          responseCode: 200,
          responsePagePath: '/index.html'
        }
      ],
      aliasConfiguration: {
        names: [config.get('ADMIN_URL')],
        acmCertRef: config.get('ACM_CERT_ARN')
      }
    });
    new cdk.CfnOutput(this, 'Distribution URL ADMIN', { value: distribution_admin.distributionDomainName });



  }

  get_logical_env_name(resource_type: string): string {
    
    let val = `${config.get('PROJECT_NAME')}-${config.get('ENVIRONMENT')}`
    if (resource_type) {
      val = val + '-' + resource_type;
    }

    return val;
  }

}
