pipeline{
  agent any
  environment {
    AWS_ACCESS_KEY_ID          = credentials('aws_access_key_id')
    AWS_SECRET_ACCESS_KEY      = credentials('aws_secret_access_key')
    AWS_ADMIN_CREDENTIALS      = credentials('AWS_ADMIN_CREDENTIALS')
    AWS_ACCOUNT_ID             = credentials('aws_account_id')
    AWS_ECR_PASSWORD           = credentials('aws_ecr_password')

    APP_NAME                   = "sum-article-reader-count"

    TF_VAR_lambda_role         = "arn:aws:iam::${AWS_ACCOUNT_ID}:role/article-lambda"
    TF_VAR_api_id              = "7ey4ou4hpc"
    TF_VAR_tag                 = "${env.BUILD_NUMBER}"
    TF_VAR_app_name            = "${APP_NAME}"
  }
  tools {
    terraform 'TerraformDefault'
  }
  options {
    ansiColor('xterm')
  }
  stages{
    stage('Compile TS to JS'){
      agent {
        docker {
          image 'node:14-buster'
          reuseNode true
        }
      }
      steps{
        dir('dist'){}
        sh 'npm install'
        sh 'npm run build'
        stash includes: 'dist/**/*', name: 'distJs'
      }
    }
    // stage('Docker build & push'){
    //   steps{
    //     sh 'ls -al'
    //     dir('dist'){
    //       unstash 'distJs'
    //     }
    //     sh 'aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com'
    //     sh 'docker build -t ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/${APP_NAME}:${TF_VAR_tag} .'
    //     sh 'docker push ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/${APP_NAME}:${TF_VAR_tag}'
    //   }
    // }
    stage('Docker build & push'){
      steps{
        sh 'ls -al'
        dir('dist'){
          unstash 'distJs'
        }
        script{
          docker.withRegistry("https://your.ecr.domain.amazonws.com", "ecr:us-east-1:${AWS_ADMIN_CREDENTIALS}") {
            docker.image("${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/${APP_NAME}:${TF_VAR_tag}").push()
          }
        }
        // sh 'aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com'
        // sh 'docker build -t ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/${APP_NAME}:${TF_VAR_tag} .'
        // sh 'docker push ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/${APP_NAME}:${TF_VAR_tag}'
      }
    }
    stage('Terraform Apply'){
      steps{
        dir('terraform'){
          sh 'terraform init -input=false'
          sh 'terraform plan -out=tfplan -input=false'
          sh 'terraform apply -input=false -auto-approve tfplan'
        }
        sh 'rm -rf dist/' 
      }
    }
  }
}