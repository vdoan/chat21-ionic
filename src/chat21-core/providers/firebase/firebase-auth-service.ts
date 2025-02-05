import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

// firebase
// import * as firebase from 'firebase/app';
import firebase from "firebase/app";
import 'firebase/messaging';
import 'firebase/database';
import 'firebase/auth';

// services
import { MessagingAuthService } from '../abstract/messagingAuth.service';
// import { ImageRepoService } from '../abstract/image-repo.service';
// import { FirebaseImageRepoService } from './firebase-image-repo';

// models
import { UserModel } from '../../models/user';

// utils
import {
  avatarPlaceholder,
  getColorBck,
} from '../../utils/utils-user';
import { resolve } from 'url';
import { CustomLogger } from '../logger/customLogger';
import { AppStorageService } from '../abstract/app-storage.service';
import { LoggerInstance } from '../logger/loggerInstance';
import { LoggerService } from '../abstract/logger.service';


// @Injectable({ providedIn: 'root' })
@Injectable()
export class FirebaseAuthService extends MessagingAuthService {


  // BehaviorSubject
  BSAuthStateChanged: BehaviorSubject<any>;
  BSSignOut: BehaviorSubject<any>;
  // firebaseSignInWithCustomToken: BehaviorSubject<any>;

  // public params
  // private persistence: string;
  public SERVER_BASE_URL: string;

  // private
  private URL_TILEDESK_SIGNIN: string;
  private URL_TILEDESK_SIGNIN_ANONYMOUSLY: string;
  private URL_TILEDESK_CREATE_CUSTOM_TOKEN: string;
  private URL_TILEDESK_SIGNIN_WITH_CUSTOM_TOKEN: string;
  //TODO-GAB
  // private imageRepo: ImageRepoService = new FirebaseImageRepoService();

  private firebaseToken: string;
  private logger:LoggerService = LoggerInstance.getInstance()
  constructor(
    public http: HttpClient
  ) {
    super();
  }

  /**
   *
   */
  initialize() {
   
    this.SERVER_BASE_URL = this.getBaseUrl();
    this.URL_TILEDESK_CREATE_CUSTOM_TOKEN = this.SERVER_BASE_URL + 'chat21/firebase/auth/createCustomToken';
    this.logger.info('[FIREBASEAuthSERVICE] - initialize URL_TILEDESK_CREATE_CUSTOM_TOKEN ', this.URL_TILEDESK_CREATE_CUSTOM_TOKEN)
    // this.URL_TILEDESK_SIGNIN = this.SERVER_BASE_URL + 'auth/signin';
    // this.URL_TILEDESK_SIGNIN_ANONYMOUSLY = this.SERVER_BASE_URL + 'auth/signinAnonymously'
    // this.URL_TILEDESK_SIGNIN_WITH_CUSTOM_TOKEN = this.SERVER_BASE_URL + 'auth/signinWithCustomToken';
    // this.checkIsAuth();
    this.onAuthStateChanged();
  }

  /**
   * checkIsAuth
   */
  // checkIsAuth() {
  //   this.logger.printDebug(' ---------------- AuthService checkIsAuth ---------------- ')
  //   this.tiledeskToken = this.appStorage.getItem('tiledeskToken')
  //   this.currentUser = JSON.parse(this.appStorage.getItem('currentUser'));
  //   if (this.tiledeskToken) {
  //     this.logger.printDebug(' ---------------- MI LOGGO CON UN TOKEN ESISTENTE NEL LOCAL STORAGE O PASSATO NEI PARAMS URL ---------------- ')
  //     this.createFirebaseCustomToken();
  //   }  else {
  //     this.logger.printDebug(' ---------------- NON sono loggato ---------------- ')
  //     // this.BSAuthStateChanged.next('offline');
  //   }

  //   // da rifattorizzare il codice seguente!!!
  //   // const that = this;
  //   // this.route.queryParams.subscribe(params => {
  //   //   if (params.tiledeskToken) {
  //   //     that.tiledeskToken = params.tiledeskToken;
  //   //   }
  //   // });
  // }


  /** */
  getToken(): string {
    return this.firebaseToken;
  }


  // ********************* START FIREBASE AUTH ********************* //
  /**
   * FIREBASE: onAuthStateChanged
   */
  onAuthStateChanged() {
    const that = this;
    firebase.auth().onAuthStateChanged(user => {
      this.logger.debug('[FIREBASEAuthSERVICE] onAuthStateChanged', user)
      if (!user) {
        this.logger.debug('[FIREBASEAuthSERVICE] 1 - PASSO OFFLINE AL CHAT MANAGER')
        that.BSAuthStateChanged.next('offline');
      } else {
        this.logger.debug('[FIREBASEAuthSERVICE] 2 - PASSO ONLINE AL CHAT MANAGER')
        that.BSAuthStateChanged.next('online');
      }
    });
  }

  /**
   * FIREBASE: signInWithCustomToken
   * @param token
   */
  signInFirebaseWithCustomToken(token: string): Promise<any> {
    const that = this;
    let firebasePersistence;
    switch (this.getPersistence()) {
      case 'SESSION': {
        firebasePersistence = firebase.auth.Auth.Persistence.SESSION;
        break;
      }
      case 'LOCAL': {
        firebasePersistence = firebase.auth.Auth.Persistence.LOCAL;
        break;
      }
      case 'NONE': {
        firebasePersistence = firebase.auth.Auth.Persistence.NONE;
        break;
      }
      default: {
        firebasePersistence = firebase.auth.Auth.Persistence.NONE;
        break;
      }
    }
    return firebase.auth().setPersistence(firebasePersistence).then( async () => {
      return firebase.auth().signInWithCustomToken(token).then( async () => {
                // that.firebaseSignInWithCustomToken.next(response);
              }).catch((error) => {
                that.logger.error('[FIREBASEAuthSERVICE] signInFirebaseWithCustomToken Error: ', error);
                  // that.firebaseSignInWithCustomToken.next(null);
              });
    }).catch((error) => {
      that.logger.error('[FIREBASEAuthSERVICE] signInFirebaseWithCustomToken Error: ', error);
    });
  }

  /**
   * FIREBASE: createUserWithEmailAndPassword
   * @param email
   * @param password
   * @param firstname
   * @param lastname
   */
  createUserWithEmailAndPassword(email: string, password: string): any {
    const that = this;
    return firebase.auth().createUserWithEmailAndPassword(email, password).then((response) => {
      that.logger.debug('[FIREBASEAuthSERVICE] CRATE USER WITH EMAIL: ', email, ' & PSW: ', password);
      // that.firebaseCreateUserWithEmailAndPassword.next(response);
      return response;
    }).catch((error) => {
      that.logger.error('[FIREBASEAuthSERVICE] createUserWithEmailAndPassword error: ', error.message);
      return error;
    });
  }


  /**
   * FIREBASE: sendPasswordResetEmail
   */
  sendPasswordResetEmail(email: string): any {
    const that = this;
    return firebase.auth().sendPasswordResetEmail(email).then(() => {
      that.logger.debug('[FIREBASEAuthSERVICE] firebase-send-password-reset-email');
      // that.firebaseSendPasswordResetEmail.next(email);
    }).catch((error) => {
      that.logger.error('[FIREBASEAuthSERVICE] sendPasswordResetEmail error: ', error);
    });
  }

  /**
   * FIREBASE: signOut
   */
  private signOut() {
    const that = this;
    firebase.auth().signOut().then(() => {
      that.logger.debug('[FIREBASEAuthSERVICE] firebase-sign-out');
      // cancello token
      // this.appStorage.removeItem('tiledeskToken');
      //localStorage.removeItem('firebaseToken');
      that.BSSignOut.next(true);
    }).catch((error) => {
      that.logger.error('[FIREBASEAuthSERVICE] signOut error: ', error);
    });
  }


  /**
   * FIREBASE: currentUser delete
   */
  delete() {
    const that = this;
    firebase.auth().currentUser.delete().then(() => {
      that.logger.debug('[FIREBASEAuthSERVICE] firebase-current-user-delete');
      // that.firebaseCurrentUserDelete.next();
    }).catch((error) => {
      that.logger.error('[FIREBASEAuthSERVICE] delete error: ', error);
    });
  }

  // ********************* END FIREBASE AUTH ********************* //


  /**
   *
   * @param token
   */
  createCustomToken(tiledeskToken: string) {
    const headers = new HttpHeaders({
      'Content-type': 'application/json',
      Authorization: tiledeskToken
    });
    const responseType = 'text';
    const postData = {};
    const that = this;
    this.http.post(this.URL_TILEDESK_CREATE_CUSTOM_TOKEN, postData, { headers, responseType }).subscribe(data => {
      that.firebaseToken = data;
      //localStorage.setItem('firebaseToken', that.firebaseToken);
      that.signInFirebaseWithCustomToken(data)
    }, error => {
      that.logger.error('[FIREBASEAuthSERVICE] createFirebaseCustomToken ERR ', error) 
    });
  }

  logout() {
    this.logger.debug('[FIREBASEAuthSERVICE] logout');
    // cancello token firebase dal local storage e da firebase
    // dovrebbe scattare l'evento authchangeStat
    this.signOut();
  }

}
