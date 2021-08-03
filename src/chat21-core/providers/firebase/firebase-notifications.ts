import { Injectable } from '@angular/core';
// services
import { NotificationsService } from '../abstract/notifications.service';
import { LoggerInstance } from '../logger/loggerInstance';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
// firebase
// import * as firebase from 'firebase/app';
import firebase from "firebase/app";
import 'firebase/messaging';
import 'firebase/auth';

@Injectable({ providedIn: 'root' })

export class FirebaseNotifications extends NotificationsService {
    
    public BUILD_VERSION: string;
    private FCMcurrentToken: string;
    private userId: string;
    private tenant: string;
    private logger: LoggerService = LoggerInstance.getInstance();
    constructor() {
        super();
    }

    initialize(tenant: string): void{
        this.tenant = tenant
    }

    getNotificationPermissionAndSaveToken(currentUserUid) {
        this.tenant = this.getTenant();
        this.logger.debug('[FIREBASE-NOTIFICATIONS] calling requestPermission - tenant ', this.tenant)
        this.logger.debug('[FIREBASE-NOTIFICATIONS] calling requestPermission - currentUserUid ', currentUserUid)
        this.userId = currentUserUid;
        const messaging = firebase.messaging();
        if (firebase.messaging.isSupported()) {
            // messaging.requestPermission()
            Notification.requestPermission()
                .then(() => {
                    this.logger.debug('[FIREBASE-NOTIFICATIONS] >>>> requestPermission Notification permission granted.');
                    return messaging.getToken()
                })
                .then(FCMtoken => {
                    this.logger.debug('[FIREBASE-NOTIFICATIONS] >>>> requestPermission FCMtoken', FCMtoken)
                    // Save FCM Token in Firebase
                    this.FCMcurrentToken = FCMtoken;
                    this.updateToken(FCMtoken, currentUserUid)
                })
                .catch((err) => {
                    this.logger.error('[FIREBASE-NOTIFICATIONS] >>>> requestPermission ERR: Unable to get permission to notify.', err);
                });
        }
    }

    removeNotificationsInstance(callback: (string) => void) {
        firebase.auth().onAuthStateChanged(function (user) {
            if (user) {
                this.logger.debug('[FIREBASE-NOTIFICATIONS] - User is signed in. ', user)

            } else {
                this.logger.debug('[FIREBASE-NOTIFICATIONS] - No user is signed in. ', user)
            }
        });

        this.logger.debug('[FIREBASE-NOTIFICATIONS] >>>> removeNotificationsInstance > this.userId', this.userId);
        this.logger.debug('[FIREBASE-NOTIFICATIONS] >>>> removeNotificationsInstance > FCMcurrentToken', this.FCMcurrentToken);

        const urlNodeFirebase = '/apps/' + this.tenant
        const connectionsRefinstancesId = urlNodeFirebase + '/users/' + this.userId + '/instances/'

        let connectionsRefURL = '';
        if (connectionsRefinstancesId) {
            connectionsRefURL = connectionsRefinstancesId + '/' + this.FCMcurrentToken;
            const connectionsRef = firebase.database().ref().child(connectionsRefURL);
            
            connectionsRef.remove()
                .then(() => {
                    this.logger.debug("[FIREBASE-NOTIFICATIONS] >>>> removeNotificationsInstance > Remove succeeded.")
                    callback('success')
                }).catch((error) => {
                    this.logger.error("[FIREBASE-NOTIFICATIONS] >>>> removeNotificationsInstance Remove failed: " + error.message)
                    callback('error')
                }).finally(() => {
                    this.logger.debug('[FIREBASE-NOTIFICATIONS] COMPLETED');
                })
        }
    }

    // removeNotificationsInstance() {
    //     let promise = new Promise((resolve, reject) => {
    //         this.appStoreService.getInstallation(this.projectId).then((res) => {
    //             console.log("Get Installation Response: ", res);
    //             resolve(res);
    //         }).catch((err) => {
    //             console.error("Error getting installation: ", err);
    //             reject(err);
    //         })
    //     })
    //     return promise;
    // }


    // ********** PRIVATE METHOD - START ****************//
    private updateToken(FCMcurrentToken, currentUserUid) {
        this.logger.debug('[FIREBASE-NOTIFICATIONS] >>>> getPermission > updateToken ', FCMcurrentToken);
        // this.afAuth.authState.take(1).subscribe(user => {
        if (!currentUserUid || !FCMcurrentToken) {
            return
        };

        const connection = FCMcurrentToken;
        const updates = {};
        const urlNodeFirebase = '/apps/' + this.tenant
        const connectionsRefinstancesId = urlNodeFirebase + '/users/' + currentUserUid + '/instances/';

        // this.connectionsRefinstancesId = this.urlNodeFirebase + "/users/" + userUid + "/instances/";
        const device_model = {
            device_model: navigator.userAgent,
            language: navigator.language,
            platform: 'ionic',
            platform_version: this.BUILD_VERSION
        }

        updates[connectionsRefinstancesId + connection] = device_model;

        this.logger.debug('[FIREBASE-NOTIFICATIONS] >>>> getPermission > updateToken in DB', updates);
        firebase.database().ref().update(updates)
    }
    // ********** PRIVATE METHOD - END ****************//



}
