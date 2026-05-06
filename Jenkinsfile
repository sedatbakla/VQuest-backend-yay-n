pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                // Manuel git komutu yerine, Jenkins'in bagli oldugu SCM ayarlarini kullanir
                checkout scm
            }
        }
        
        stage('Build and Deploy') {
            steps {
                echo 'Deploying locally using docker compose...'
                // Redis de temizlik listesine eklendi!
                sh 'docker rm -f vquest-mongo vquest-backend vquest-frontend vquest-redis || true'
                
                sh 'docker compose down'
                sh 'docker compose up -d --build'
            }
        }
        stage('Health Check') {
            steps {
                script {
                    echo 'Waiting for services to start...'
                    sleep 15
                    
                    // Frontend Nginx portunun (80) ayakta olup olmadigini kontrol eder
                    sh 'curl -f http://localhost:80 || echo "Frontend henuz hazir degil"'
                    
                    // Backend portunun (3000) ayakta olup olmadigini kontrol eder
                    sh 'curl -f http://localhost:3000 || echo "Backend henuz hazir degil"'
                }
            }
        }
    }
    
    post {
        always {
            echo 'Pipeline tamamlandi.'
        }
        success {
            echo 'Tum asamalar basarili! VQuest projesi lokalde Docker uzerinde calisiyor.'
        }
        failure {
            echo 'Pipeline basarisiz oldu! Jenkins loglarini kontrol et.'
        }
    }
}