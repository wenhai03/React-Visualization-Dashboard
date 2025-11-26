pipeline {
    agent any
    options {
        buildDiscarder(logRotator(numToKeepStr: '7'))
        timeout(time: 1, unit: 'HOURS')
        timestamps()
        ansiColor('xterm')
    }
    environment {
        VERSION = readJSON(file: 'package.json').version.trim()
    }
    stages {
        stage('Prepare') {
            when {
                anyOf {
                    branch 'develop'
                    branch 'testing'
                    branch 'master'
                }
            }
            steps {
                script {
                    def output = sh(returnStdout: true, script: "case ${env.BRANCH_NAME} in develop) echo -dev.${env.BUILD_ID};; testing) echo -sit.${env.BUILD_ID};; master) echo '';; *) echo -snapshot.${env.BUILD_ID};; esac")
                    env.PRE_RELEASE = output.trim()
                    def now = sh(returnStdout: true, script: "date -Iseconds")
                    env.NOW = now.trim()
                    def rev = sh(returnStdout: true, script: "git rev-parse --short=8 HEAD")
                    env.COMMIT = rev.trim()
                }
                sh "echo VITE_VERSION_INFO=${env.PRE_RELEASE} >> .env.local"
                sh "echo VITE_GIT_BRANCH=${env.BRANCH_NAME} >> .env.local"
                sh "echo VITE_GIT_COMMIT=${env.COMMIT} >> .env.local"
                sh "echo VITE_NOW=${env.NOW} >> .env.local"
            }
        }
        stage('Build') {
            steps {
                script {
                    docker.withRegistry('https://harbor.devops.cndinfo.com', 'harbor') {
                        def customImage = docker.build("elk/ms-web:${env.VERSION}${env.PRE_RELEASE}", "-f docker/Dockerfile .")
                        customImage.push()
                    }
                }
            }
        }
        stage('Deploy dev') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    def remote = [:]
                    remote.name = 'dev54'
                    remote.host = '172.18.49.54'
                    remote.allowAnyHosts = true
                    remote.fileTransfer = 'scp'
                    withCredentials([sshUserPrivateKey(credentialsId: 'dev54', keyFileVariable: 'identity', passphraseVariable: '', usernameVariable: 'userName')]) {
                        remote.user = userName
                        remote.identityFile = identity
                        sshCommand remote: remote, command: "cd /home/user/deploy/ && sed -i '/^MS_WEB_VER=/d' .env && echo MS_WEB_VER=${env.VERSION}${env.PRE_RELEASE} >> .env && docker compose pull ms-web && docker compose up -d"
                    }
                }
            }
        }
        stage('Deploy test') {
            when {
                branch 'testing'
            }
            steps {
                script {
                    def remote = [:]
                    remote.name = 'test177'
                    remote.host = '172.18.39.177'
                    remote.allowAnyHosts = true
                    remote.fileTransfer = 'scp'
                    withCredentials([sshUserPrivateKey(credentialsId: 'test177', keyFileVariable: 'identity', passphraseVariable: '', usernameVariable: 'userName')]) {
                        remote.user = userName
                        remote.identityFile = identity
                        sshCommand remote: remote, command: "cd /app/elk/ && sed -i '/^MS_WEB_VERSION=/d' env && echo MS_WEB_VERSION=${env.VERSION}${env.PRE_RELEASE} >> env && ./service pull ms-web && ./service restart ms-web"
                    }
                }
            }
        }
    }
    post {
        always {
            qyWechatNotification webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=1d7526f0-88b2-41af-ae12-4ca94ca8bbbb'
        }
    }
}