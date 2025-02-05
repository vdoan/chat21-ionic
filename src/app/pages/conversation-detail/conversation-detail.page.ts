import { URL_SOUND_LIST_CONVERSATION } from './../../../chat21-core/utils/constants';
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, Directive, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, ToastController, PopoverController, Platform, ActionSheetController, NavController, IonContent, IonTextarea } from '@ionic/angular';

// models
import { UserModel } from 'src/chat21-core/models/user';
import { MessageModel } from 'src/chat21-core/models/message';
import { ConversationModel } from 'src/chat21-core/models/conversation';
import { GroupModel } from 'src/chat21-core/models/group';

// services
import { ChatManager } from 'src/chat21-core/providers/chat-manager';
import { AppConfigProvider } from '../../services/app-config';

import { CustomTranslateService } from 'src/chat21-core/providers/custom-translate.service';
import { TypingService } from 'src/chat21-core/providers/abstract/typing.service';
import { ConversationHandlerBuilderService } from 'src/chat21-core/providers/abstract/conversation-handler-builder.service';
import { GroupsHandlerService } from 'src/chat21-core/providers/abstract/groups-handler.service';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { ConversationsHandlerService } from 'src/chat21-core/providers/abstract/conversations-handler.service';
import { ArchivedConversationsHandlerService } from 'src/chat21-core/providers/abstract/archivedconversations-handler.service';
import { ConversationHandlerService } from 'src/chat21-core/providers/abstract/conversation-handler.service';
import { ContactsService } from 'src/app/services/contacts/contacts.service';
import { CannedResponsesService } from '../../services/canned-responses/canned-responses.service';
import { compareValues } from '../../../chat21-core/utils/utils';
import { ImageRepoService } from 'src/chat21-core/providers/abstract/image-repo.service';
import { PresenceService } from 'src/chat21-core/providers/abstract/presence.service';

// utils
import { TYPE_MSG_TEXT, MESSAGE_TYPE_INFO, MESSAGE_TYPE_MINE, MESSAGE_TYPE_OTHERS } from '../../../chat21-core/utils/constants';
import { checkPlatformIsMobile, checkWindowWidthIsLessThan991px, setConversationAvatar, setChannelType } from '../../../chat21-core/utils/utils';
import { isFirstMessage, isInfo, isMine, messageType } from 'src/chat21-core/utils/utils-message';

// Logger
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';


@Component({
  selector: 'app-conversation-detail',
  templateUrl: './conversation-detail.page.html',
  styleUrls: ['./conversation-detail.page.scss'],
})

export class ConversationDetailPage implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('ionContentChatArea', { static: false }) ionContentChatArea: IonContent;
  @ViewChild('rowMessageTextArea', { static: false }) rowTextArea: ElementRef;

  showButtonToBottom = false; // indica lo stato del pulsante per scrollare la chat (showed/hidden)
  NUM_BADGES = 0; // numero di messaggi non letti
  COLOR_GREEN = '#24d066'; // colore presence active da spostare nelle costanti
  COLOR_RED = '#db4437'; // colore presence none da spostare nelle costanti

  private subscriptions: Array<any>;
  public tenant: string;
  public loggedUser: UserModel;
  public conversationWith: string;
  public conversationWithFullname: string;
  public messages: Array<MessageModel> = [];
  public groupDetail: GroupModel;
  public messageSelected: any;
  public channelType: string;
  public online: boolean;
  public lastConnectionDate: string;
  public showMessageWelcome: boolean;
  public openInfoConversation = false;
  public openInfoMessage: boolean; // check is open info message 
  public isMobile = false;
  public isLessThan991px = false; // nk added
  public isTyping = false;
  public nameUserTypingNow: string;

  public heightMessageTextArea = '';
  public translationMap: Map<string, string>;
  public conversationAvatar: any;
  public membersConversation: any;
  public member: UserModel;
  public urlConversationSupportGroup: any;
  public isFileSelected: boolean;
  public showIonContent = false;
  public conv_type: string;

  public tagsCanned: any = [];
  public tagsCannedFilter: any = [];

  public window: any = window;
  public styleMap: Map<string, string> = new Map();


  MESSAGE_TYPE_INFO = MESSAGE_TYPE_INFO;
  MESSAGE_TYPE_MINE = MESSAGE_TYPE_MINE;
  MESSAGE_TYPE_OTHERS = MESSAGE_TYPE_OTHERS;

  arrowkeyLocation = -1;

  //SOUND
  setTimeoutSound: any;
  audio: any
  isOpenInfoConversation: boolean;
  USER_HAS_OPENED_CLOSE_INFO_CONV: boolean = false
  isHovering: boolean = false;

  dropEvent: any
  isMine = isMine;
  isInfo = isInfo;
  isFirstMessage = isFirstMessage;
  messageType = messageType;

  private logger: LoggerService = LoggerInstance.getInstance();
  /**
   * Constructor
   * @param route 
   * @param chatManager 
   * @param actionSheetCtrl 
   * @param platform 
   * @param customTranslateService 
   * @param appConfigProvider 
   * @param modalController 
   * @param typingService 
   * @param tiledeskAuthService 
   * @param conversationsHandlerService 
   * @param archivedConversationsHandlerService 
   * @param conversationHandlerService 
   * @param groupService 
   * @param contactsService 
   * @param conversationHandlerBuilderService 
   * @param linkifyService 
   * @param logger 
   * @param cannedResponsesService 
   * @param imageRepoService 
   * @param presenceService 
   * @param toastController 
   */
  constructor(
    private route: ActivatedRoute,
    public chatManager: ChatManager,
    public actionSheetCtrl: ActionSheetController,
    public platform: Platform,
    private customTranslateService: CustomTranslateService,
    public appConfigProvider: AppConfigProvider,
    public modalController: ModalController,
    public typingService: TypingService,
    public tiledeskAuthService: TiledeskAuthService,
    public conversationsHandlerService: ConversationsHandlerService,
    public archivedConversationsHandlerService: ArchivedConversationsHandlerService,
    public conversationHandlerService: ConversationHandlerService,
    public groupService: GroupsHandlerService,
    public contactsService: ContactsService,
    public conversationHandlerBuilderService: ConversationHandlerBuilderService,
    public cannedResponsesService: CannedResponsesService,
    public imageRepoService: ImageRepoService,
    public presenceService: PresenceService,
    public toastController: ToastController

  ) { }

  // -----------------------------------------------------------
  // @ Lifehooks
  // -----------------------------------------------------------
  ngOnInit() {
    this.logger.log('[CONVS-DETAIL] ngOnInit - window.location: ', window.location);
  }

  ngAfterViewInit() { }

  ngOnDestroy() { }


  ionViewWillEnter() {
    this.loggedUser = this.tiledeskAuthService.getCurrentUser();
    this.logger.log('[CONVS-DETAIL] ionViewWillEnter loggedUser: ', this.loggedUser);
    this.listnerStart();
  }

  ionViewDidEnter() { }

  // Unsubscibe when new page transition end
  ionViewWillLeave() {
    this.unsubescribeAll();
  }

  private listnerStart() {
    const that = this;
    this.chatManager.BSStart.subscribe((data: any) => {
      this.logger.log('[CONVS-DETAIL] - BSStart data:', data);
      if (data) {
        that.initialize();
      }
    });
  }

  // -------------------------------------------------- 
  //  @ Inizialize
  // -------------------------------------------------- 
  initialize() {
    this.loggedUser = this.tiledeskAuthService.getCurrentUser();
    this.logger.log('[CONVS-DETAIL] - initialize -> loggedUser: ', this.loggedUser);
    this.translations();
    // this.conversationSelected = localStorage.getItem('conversationSelected');
    this.showButtonToBottom = false;
    this.showMessageWelcome = false;
   
    const appconfig = this.appConfigProvider.getConfig()
    // this.tenant = appconfig.tenant;
    this.tenant = appconfig.firebaseConfig.tenant;
    this.logger.log('[CONVS-DETAIL] - initialize -> firebaseConfig tenant ', this.tenant);
   

    // Change list on date change
    this.route.paramMap.subscribe(params => {
      this.logger.log('[CONVS-DETAIL] - initialize -> params: ', params);
      this.conversationWith = params.get('IDConv');
      this.conversationWithFullname = params.get('FullNameConv');
      this.conv_type = params.get('Convtype');
    });

    this.logger.log('[CONVS-DETAIL] - initialize -> conversationWith: ', this.conversationWith, ' -> conversationWithFullname: ', this.conversationWithFullname);
    this.subscriptions = [];
    this.setHeightTextArea();
    this.tagsCanned = []; // list of canned
    this.messages = []; // list messages of conversation
    this.isFileSelected = false; // indicates if a file has been selected (image to upload)
    this.openInfoMessage = false; // indicates whether the info message panel is open

    if (checkPlatformIsMobile()) {
      this.isMobile = true;
      // this.openInfoConversation = false; // indica se è aperto il box info conversazione
      this.logger.log('[CONVS-DETAIL] - initialize -> checkPlatformIsMobile isMobile? ', this.isMobile)
    } else {
      this.isMobile = false;
      this.logger.log('[CONVS-DETAIL] - initialize -> checkPlatformIsMobile isMobile? ', this.isMobile)
      // this.openInfoConversation = true;
    }


    if (checkWindowWidthIsLessThan991px()) {
      this.logger.log('[CONVS-DETAIL] - initialize -> checkWindowWidthIsLessThan991px ', checkWindowWidthIsLessThan991px())
      this.openInfoConversation = false; // indica se è aperto il box info conversazione
      this.isOpenInfoConversation = false;
      this.logger.log('[CONVS-DETAIL] - initialize -> openInfoConversation ', this.openInfoConversation, ' -> isOpenInfoConversation ', this.isOpenInfoConversation)
    } else {
      this.logger.log('[CONVS-DETAIL] - initialize -> checkWindowWidthIsLessThan991px ', checkWindowWidthIsLessThan991px())
      this.openInfoConversation = true;
      this.isOpenInfoConversation = true;
      this.logger.log('[CONVS-DETAIL] - initialize -> openInfoConversation ', this.openInfoConversation, ' -> isOpenInfoConversation ', this.isOpenInfoConversation)
    }

    this.online = false;
    this.lastConnectionDate = '';

    // init handler vengono prima delle sottoscrizioni!
    // this.initConversationsHandler(); // nk
    if (this.conversationWith) {
      this.initConversationHandler();
      this.initGroupsHandler();
      this.initSubscriptions();
    }
    this.addEventsKeyboard();
    this.startConversation();
    this.updateConversationBadge(); // AGGIORNO STATO DELLA CONVERSAZIONE A 'LETTA' (is_new = false)
  }

  returnOpenCloseInfoConversation(openInfoConversation: boolean) {
    this.logger.log('[CONVS-DETAIL] returnOpenCloseInfoConversation - openInfoConversation ', openInfoConversation);
    this.resizeTextArea();
    this.openInfoMessage = false;
    this.openInfoConversation = openInfoConversation;
    this.isOpenInfoConversation = openInfoConversation
    this.USER_HAS_OPENED_CLOSE_INFO_CONV = true;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    const newInnerWidth = event.target.innerWidth;
    if (newInnerWidth < 991) {
      if (this.USER_HAS_OPENED_CLOSE_INFO_CONV === false) {
        this.openInfoConversation = false;
        this.isOpenInfoConversation = false;
      }
    }
  }

  // --------------------------------------------------------
  // translations
  // translationMap passed to components in the html file
  // --------------------------------------------------------
  public translations() {
    const keys = [
      'LABEL_AVAILABLE',
      'LABEL_NOT_AVAILABLE',
      'LABEL_TODAY',
      'LABEL_TOMORROW',
      'LABEL_TO',
      'LABEL_LAST_ACCESS',
      'ARRAY_DAYS',
      'LABEL_ACTIVE_NOW',
      'LABEL_IS_WRITING',
      'LABEL_INFO_ADVANCED',
      'ID_CONVERSATION',
      'UPLOAD_FILE_ERROR',
      'LABEL_ENTER_MSG',
      'LABEL_ENTER_MSG_SHORT',
      'LABEL_ENTER_MSG_SHORTER',
      'ONLY_IMAGE_FILES_ARE_ALLOWED_TO_PASTE',
      'ONLY_IMAGE_FILES_ARE_ALLOWED_TO_DRAG'
    ];

    this.translationMap = this.customTranslateService.translateLanguage(keys);
  }

  // --------------------------------------------------------
  // setTranslationMapForConversationHandler
  // --------------------------------------------------------
  private setTranslationMapForConversationHandler(): Map<string, string> {
    const keys = [
      'INFO_SUPPORT_USER_ADDED_SUBJECT',
      'INFO_SUPPORT_USER_ADDED_YOU_VERB',
      'INFO_SUPPORT_USER_ADDED_COMPLEMENT',
      'INFO_SUPPORT_USER_ADDED_VERB',
      'INFO_SUPPORT_CHAT_REOPENED',
      'INFO_SUPPORT_CHAT_CLOSED',
      'LABEL_TODAY',
      'LABEL_TOMORROW',
      'LABEL_LAST_ACCESS',
      'LABEL_TO',
      'ARRAY_DAYS'
    ];
    return this.customTranslateService.translateLanguage(keys);
  }

  // -------------------------------------------------------------------------------------
  // * retrieving the handler from chatManager
  // * if it DOESN'T EXIST I create a handler and connect and store it in the chatmanager
  // * if IT EXISTS I connect
  // * Upload the messages
  // * I wait x sec if no messages arrive I display msg wellcome
  // -------------------------------------------------------------------------------------
  initConversationHandler() {
    const translationMap = this.setTranslationMapForConversationHandler();
    this.showMessageWelcome = false;
    const handler: ConversationHandlerService = this.chatManager.getConversationHandlerByConversationId(this.conversationWith);
    this.logger.log('[CONVS-DETAIL] - initConversationHandler - handler ', handler, ' conversationWith ', this.conversationWith);
    if (!handler) {
      this.conversationHandlerService = this.conversationHandlerBuilderService.build();
      this.conversationHandlerService.initialize(
        this.conversationWith,
        this.conversationWithFullname,
        this.loggedUser,
        this.tenant,
        translationMap
      );
      this.conversationHandlerService.connect();
      this.logger.log('[CONVS-DETAIL] - initConversationHandler - NEW handler - conversationHandlerService', this.conversationHandlerService);
      this.messages = this.conversationHandlerService.messages;
      this.logger.log('[CONVS-DETAIL] - initConversationHandler - messages: ', this.messages);
      this.chatManager.addConversationHandler(this.conversationHandlerService);

      // // wait 8 second and then display the message if there are no messages
      const that = this;
      setTimeout(() => {
        if (!that.messages || that.messages.length === 0) {
          this.showIonContent = true;
          that.showMessageWelcome = true;
          this.logger.log('[CONVS-DETAIL] - initConversationHandler - setTimeout: ', that.showMessageWelcome);
        }
      }, 8000);

    } else {
      this.logger.log('[CONVS-DETAIL] - initConversationHandler (else) - conversationHandlerService ', this.conversationHandlerService, ' handler', handler);
      this.conversationHandlerService = handler;
      this.messages = this.conversationHandlerService.messages;
    }
    this.logger.log('[CONVS-DETAIL] - initConversationHandler (else) - message ', this.messages, ' showIonContent', this.showIonContent);
  }


  initGroupsHandler() {
    if (this.conversationWith.startsWith("support-group") || this.conversationWith.startsWith("group-")) {
      this.groupService.initialize(this.tenant, this.loggedUser.uid)
      this.logger.log('[CONVS-DETAIL] - initGroupsHandler - tenant', this.tenant, ' loggedUser UID', this.loggedUser.uid);
    }
  }


  private setAttributes(): any {
    const attributes: any = {
      client: navigator.userAgent,
      sourcePage: location.href,

    };

    //TODO: servono ???
    if (this.loggedUser && this.loggedUser.email) {
      attributes.userEmail = this.loggedUser.email
    }
    if (this.loggedUser && this.loggedUser.fullname) {
      attributes.userFullname = this.loggedUser.fullname
    }

    return attributes;
  }



  // ---------------------------------
  // startConversation
  // ---------------------------------
  startConversation() {
    this.logger.log('[CONVS-DETAIL] - startConversation conversationWith: ', this.conversationWith);
    if (this.conversationWith) {
      this.channelType = setChannelType(this.conversationWith);
      this.logger.log('[CONVS-DETAIL] - startConversation channelType : ', this.channelType);
      // this.selectInfoContentTypeComponent();
      this.setHeaderContent();
    }
  }

  setHeaderContent() {
    this.conversationAvatar = setConversationAvatar(
      this.conversationWith,
      this.conversationWithFullname,
      this.channelType
    );
    this.logger.log('[CONVS-DETAIL] - setHeaderContent > conversationAvatar: ', this.conversationAvatar);
  }

  returnSendMessage(e: any) {
    this.logger.log('[CONVS-DETAIL] - returnSendMessage event', e, ' - conversationWith', this.conversationWith);

    this.logger.log('[CONVS-DETAIL] - returnSendMessage event message', e.message);
    try {
      let message = '';
      if (e.message) {
        message = e.message;
      }
      const type = e.type;
      const metadata = e.metadata;

      this.sendMessage(message, type, metadata);

    } catch (err) {
      this.logger.error('[CONVS-DETAIL] - returnSendMessage error: ', err);
    }
  }


  /**
   * SendMessage
   * @param msg 
   * @param type 
   * @param metadata 
   */
  sendMessage(msg: string, type: string, metadata?: any) {
    this.logger.log('[CONVS-DETAIL] - SEND MESSAGE - MSG: ', msg);

    let fullname = this.loggedUser.uid;
    if (this.loggedUser.fullname) {
      fullname = this.loggedUser.fullname;
    }

    if (type === 'file') {

      if (msg) {
        // msg = msg + '<br>' + 'File: ' + metadata.src;
        msg = msg + '\n' + `[${metadata.name}](${metadata.src})`

      } else {
        // msg = 'File: ' + metadata.src;
        // msg =  `<a href=${metadata.src} download>
        //   ${metadata.name}
        // </a>`

        // msg = `![file-image-placehoder](./assets/images/file-alt-solid.png)` + `[${metadata.name}](${metadata.src})`
        msg = `[${metadata.name}](${metadata.src})`
      }
    }
    //     <a href="/images/myw3schoolsimage.jpg" download>
    //   <img src="/images/myw3schoolsimage.jpg" alt="W3Schools" width="104" height="142">
    // </a>

    (metadata) ? metadata = metadata : metadata = '';
    this.logger.log('[CONVS-DETAIL] - SEND MESSAGE msg: ', msg, ' - messages: ', this.messages, ' - loggedUser: ', this.loggedUser);
    if (msg && msg.trim() !== '' || type !== TYPE_MSG_TEXT) {
      this.conversationHandlerService.sendMessage(
        msg,
        type,
        metadata,
        this.conversationWith,
        this.conversationWithFullname,
        this.loggedUser.uid,
        fullname,
        this.channelType,
        this.setAttributes()
      );

    }
  }

  // ----------------------------------------------------------
  // InitSubscriptions BS subscriptions 
  // ----------------------------------------------------------
  initSubscriptions() {
    this.logger.log('[CONVS-DETAIL] - initSubscriptions: ', this.subscriptions);

    const that = this;
    let subscription: any;
    let subscriptionKey: string;


    subscriptionKey = 'BSConversationsChanged';
    subscription = this.subscriptions.find(item => item.key === subscriptionKey);
    if (!subscription) {
      subscription = this.conversationsHandlerService.conversationChanged.subscribe((data: ConversationModel) => {
        this.logger.log('[CONVS-DETAIL] subscribe BSConversationsChanged data ', data, ' this.loggedUser.uid:', this.loggedUser.uid);

        if (data && data.sender !== this.loggedUser.uid) {
          this.logger.log('[CONVS-DETAIL] subscribe to BSConversationsChange data sender ', data.sender)
          this.logger.log('[CONVS-DETAIL] subscribe to BSConversationsChange this.loggedUser.uid ', this.loggedUser.uid)
          this.logger.log('[CONVS-DETAIL] subscribe to BSConversationsChange is_new ', data.is_new)
          this.logger.log('[CONVS-DETAIL] subscribe to  BSConversationsChange showButtonToBottom ', this.showButtonToBottom)
          // UPDATE THE CONVERSATION TO 'READ' IF IT IS ME WHO WRITES THE LAST MESSAGE OF THE CONVERSATION
          // AND IF THE POSITION OF THE SCROLL IS AT THE END
          if (!this.showButtonToBottom && data.is_new) { // ARE AT THE END
            this.updateConversationBadge()
          }
        }
      });
      const subscribe = { key: subscriptionKey, value: subscription };
      this.subscriptions.push(subscribe);
    }

    subscriptionKey = 'messageAdded';
    subscription = this.subscriptions.find(item => item.key === subscriptionKey);
    if (!subscription) {
      this.logger.log('[CONVS-DETAIL] subscribe to messageAdded - conversationHandlerService', this.conversationHandlerService);
      subscription = this.conversationHandlerService.messageAdded.subscribe((msg: any) => {
        this.logger.log('[CONVS-DETAIL] subscribe to messageAdded - msg ', msg);
        if (msg) {
          that.newMessageAdded(msg);
        }
      });
      const subscribe = { key: subscriptionKey, value: subscription };
      this.subscriptions.push(subscribe);
    }

    // IS USED ?
    subscriptionKey = 'messageChanged';
    subscription = this.subscriptions.find(item => item.key === subscriptionKey);
    if (!subscription) {
      this.logger.log('[CONVS-DETAIL] subscribe to messageChanged');
      subscription = this.conversationHandlerService.messageChanged.subscribe((msg: any) => {
        this.logger.log('[CONVS-DETAIL] subscribe to messageChanged - msg ', msg);
      });
      const subscribe = { key: subscriptionKey, value: subscription };
      this.subscriptions.push(subscribe);
    }


    subscriptionKey = 'messageRemoved';
    subscription = this.subscriptions.find(item => item.key === subscriptionKey);
    if (!subscription) {
      this.logger.log('[CONVS-DETAIL] subscribe to messageRemoved');
      subscription = this.conversationHandlerService.messageRemoved.subscribe((messageId: any) => {
        this.logger.log('[CONVS-DETAIL] subscribe to messageRemoved - messageId ', messageId);
      });
      const subscribe = { key: subscriptionKey, value: subscription };
      this.subscriptions.push(subscribe);
    }

    subscriptionKey = 'onGroupChange';
    subscription = this.subscriptions.find(item => item.key === subscriptionKey);
    if (!subscription) {
      this.logger.log('[CONVS-DETAIL] subscribe to onGroupChange');
      subscription = this.groupService.onGroupChange(this.conversationWith).subscribe(groupDetail => {
        this.groupDetail = groupDetail;

        this.logger.log('[CONVS-DETAIL] subscribe to onGroupChange - groupDetail ', this.groupDetail)

        /* Unesed Code */
        // let memberStr = JSON.stringify(this.groupDetail.members);
        // let arrayMembers = [];
        // JSON.parse(memberStr, (key, value) => {
        //   arrayMembers.push(key);
        // });

      });
      const subscribe = { key: subscriptionKey, value: subscription };
      this.subscriptions.push(subscribe);
    }
  }


  // -------------------------------------------------
  // addEventsKeyboard
  // -------------------------------------------------
  addEventsKeyboard() {
    window.addEventListener('keyboardWillShow', () => {
      this.logger.log('[CONVS-DETAIL] - Keyboard will Show');
    });
    window.addEventListener('keyboardDidShow', () => {
      this.logger.log('[CONVS-DETAIL] - Keyboard is Shown');
    });
    window.addEventListener('keyboardWillHide', () => {
      this.logger.log('[CONVS-DETAIL] - Keyboard will Hide');
    });
    window.addEventListener('keyboardDidHide', () => {
      this.logger.log('[CONVS-DETAIL] - Keyboard is Hidden');
    });
  }

  // ----------------------------------------------------------------
  // @ Unsubscribe all subscribed events (called in ionViewWillLeave)
  // ----------------------------------------------------------------
  unsubescribeAll() {
    this.logger.log('|[CONVS-DETAIL] unsubescribeAll 1: ', this.subscriptions);
    if (this.subscriptions) {
      this.logger.log('[CONVS-DETAIL] unsubescribeAll 2: ', this.subscriptions);
      this.subscriptions.forEach(subscription => {
        subscription.value.unsubscribe(); // vedere come fare l'unsubscribe!!!!
      });
      this.subscriptions = [];

      // https://www.w3schools.com/jsref/met_element_removeeventlistener.asp
      window.removeEventListener('keyboardWillShow', null);
      window.removeEventListener('keyboardDidShow', null);
      window.removeEventListener('keyboardWillHide', null);
      window.removeEventListener('keyboardDidHide', null);
    }
    // this.conversationHandlerService.dispose();
  }


  /**
   * newMessageAdded 
   * @param message
   */
  newMessageAdded(message: MessageModel) {
    if (message) {
      this.logger.log('[CONVS-DETAIL] - newMessageAdded message ', message);

      if (message.isSender) {
        this.scrollBottom(0);

      } else if (!message.isSender) {
        if (this.showButtonToBottom) { // NON SONO ALLA FINE
          this.NUM_BADGES++;
        } else { //SONO ALLA FINE
          this.scrollBottom(0);
        }
      }
    }
  }

  updateConversationBadge() {
    if (this.conversationWith && this.conversationsHandlerService && this.conv_type === 'active') {
      this.conversationsHandlerService.setConversationRead(this.conversationWith)
    } else if (this.conversationWith && this.archivedConversationsHandlerService && this.conv_type === 'archived') {
      this.archivedConversationsHandlerService.setConversationRead(this.conversationWith)
    }
  }

  // -----------------------------------------------------------
  // OUTPUT-EVENT handler  
  // -----------------------------------------------------------
  logScrollStart(event: any) {
    this.logger.log('[CONVS-DETAIL] logScrollStart: ', event);
  }

  logScrolling(event: any) {
    // EVENTO IONIC-NATIVE: SCATTA SEMPRE, QUINDI DECIDO SE MOSTRARE O MENO IL BADGE 
    this.logger.log('[CONVS-DETAIL] logScrolling: ', event);
    this.detectBottom()
  }

  logScrollEnd(event: any) {
    this.logger.log('[CONVS-DETAIL] logScrollEnd: ', event);
  }


  returnChangeTextArea(e: any) {
    this.logger.log('[CONVS-DETAIL] returnChangeTextArea event', e);
    try {
      let height: number = e.offsetHeight;
      if (height < 50) {
        height = 50;
      }

      this.heightMessageTextArea = height.toString(); //e.target.scrollHeight + 20;
      const message = e.msg;
      this.logger.log('[CONVS-DETAIL] returnChangeTextArea heightMessageTextArea ', this.heightMessageTextArea);

      this.logger.log('[CONVS-DETAIL] returnChangeTextArea e.detail.value', e.msg);
      this.logger.log('[CONVS-DETAIL] returnChangeTextArea loggedUser uid:', this.loggedUser.uid);
      this.logger.log('[CONVS-DETAIL] returnChangeTextArea loggedUser firstname:', this.loggedUser.firstname);
      this.logger.log('[CONVS-DETAIL] returnChangeTextArea conversationSelected uid:', this.conversationWith);
      this.logger.log('[CONVS-DETAIL] returnChangeTextArea channelType:', this.channelType);
      let idCurrentUser = '';
      let userFullname = '';

      // serve x mantenere la compatibilità con le vecchie chat
      // if (this.channelType === TYPE_DIRECT) {
      //   userId = this.loggedUser.uid;
      // }
      idCurrentUser = this.loggedUser.uid;

      if (this.loggedUser.firstname && this.loggedUser.firstname !== undefined) {
        userFullname = this.loggedUser.firstname;
      }
      this.typingService.setTyping(this.conversationWith, message, idCurrentUser, userFullname);



      // ----------------------------------------------------------
      // DISPLAY CANNED RESPONSES if message.lastIndexOf("/")
      // ----------------------------------------------------------
      setTimeout(() => {
        var pos = message.lastIndexOf("/");
        this.logger.log("[CONVS-DETAIL] - returnChangeTextArea - canned responses pos of / ", pos);
        this.logger.log("[CONVS-DETAIL] - returnChangeTextArea - pos:: ", pos);
        if (pos >= 0) {
        // if (pos === 0) {
          // && that.tagsCanned.length > 0
          var strSearch = message.substr(pos + 1);
          this.logger.log("[CONVS-DETAIL] - returnChangeTextArea - canned responses strSearch ", strSearch);
          this.loadTagsCanned(strSearch);

        } else {
          this.tagsCannedFilter = [];
        }
      }, 300);
      // ./ CANNED RESPONSES //

    } catch (err) {
      this.logger.error('[CONVS-DETAIL] - returnChangeTextArea - error: ', err);
    }
  }

  // ----------------------------------------------------------
  // @ CANNED RESPONSES methods
  // ----------------------------------------------------------
  loadTagsCanned(strSearch) {
    this.logger.log("[CONVS-DETAIL] - loadTagsCanned strSearch ", strSearch);

    let projectId = ""
    if (this.groupDetail && this.groupDetail['attributes'] && this.groupDetail['attributes']['projectId']) {
      this.logger.log("[CONVS-DETAIL] - loadTagsCanned groupDetail ", this.groupDetail);
      projectId = this.groupDetail['attributes']['projectId']

      this.logger.log('[CONVS-DETAIL] - loadTagsCanned groupDetail > attributes > project id', this.groupDetail['attributes']['projectId']);


      const tiledeskToken = this.tiledeskAuthService.getTiledeskToken();
      this.logger.log('[CONVS-DETAIL] - loadTagsCanned tagsCanned.length', this.tagsCanned.length);
      //if(this.tagsCanned.length <= 0 ){
      this.tagsCanned = [];
      this.cannedResponsesService.getCannedResponses(tiledeskToken, projectId).subscribe(res => {
        this.logger.log('[CONVS-DETAIL] - loadTagsCanned  getCannedResponses RES', res);

        this.tagsCanned = res
        this.showTagsCanned(strSearch);

      }, (error) => {
        this.logger.error('[CONVS-DETAIL] - loadTagsCanned  getCannedResponses - ERROR  ', error);

      }, () => {
        this.logger.log('[CONVS-DETAIL] - loadTagsCanned  getCannedResponses * COMPLETE *');

      });
    }
  }

  showTagsCanned(strSearch) {
    this.logger.log('[CONVS-DETAIL] - showTagsCanned strSearch ', strSearch);
    this.tagsCannedFilter = [];
    var tagsCannedClone = JSON.parse(JSON.stringify(this.tagsCanned));
    this.logger.log('[CONVS-DETAIL] - showTagsCanned tagsCannedClone ', tagsCannedClone);
    //this.logger.log("that.contacts lenght:: ", strSearch);
    this.tagsCannedFilter = this.filterItems(tagsCannedClone, strSearch);
    this.logger.log('[CONVS-DETAIL] - showTagsCanned tagsCannedFilter ', this.tagsCannedFilter);

    this.tagsCannedFilter.sort(compareValues('title', 'asc'));
    var strReplace = strSearch;
    if (strSearch.length > 0) {
      strReplace = "<b class='highlight-search-string'>" + strSearch + "</b>";
    }
    for (var i = 0; i < this.tagsCannedFilter.length; i++) {

      const textCanned = "<div class='cannedText'>" + this.replacePlaceholderInCanned(this.tagsCannedFilter[i].text) + "</div>";
      this.tagsCannedFilter[i].title = "<div class='cannedContent'><div class='cannedTitle'>" + this.tagsCannedFilter[i].title.toString().replace(strSearch, strReplace.trim()) + "</div>" + textCanned + '</div>';

    }
  }

  filterItems(items, searchTerm) {
    this.logger.log('[CONVS-DETAIL] filterItems tagsCannedClone ', items, ' searchTerm: ', searchTerm);
    //this.logger.log("filterItems::: ",searchTerm);
    return items.filter((item) => {
      //this.logger.log("filterItems::: ", item.title.toString().toLowerCase());
      this.logger.log('[CONVS-DETAIL] filtered tagsCannedClone item ', item);
      return item.title.toString().toLowerCase().indexOf(searchTerm.toString().toLowerCase()) > -1;
    });
  }

  replacePlaceholderInCanned(str) {
    this.logger.log('[CONVS-DETAIL] - replacePlaceholderInCanned str ', str);

    if (this.groupDetail && this.groupDetail['attributes'] && this.groupDetail['attributes']['userFullname']) {
      str = str.replace('$recipient_name', this.groupDetail['attributes']['userFullname']);
    }
    if (this.loggedUser && this.loggedUser.fullname) {
      str = str.replace('$agent_name', this.loggedUser.fullname);
    }
    return str;
  }

  replaceTagInMessage(canned) {
    const elTextArea = this.rowTextArea['el'];
    const textArea = elTextArea.getElementsByTagName('ion-textarea')[0];
    this.logger.log("[CONVS-DETAIL] replaceTagInMessage  textArea ", textArea);
    this.logger.log("[CONVS-DETAIL] replaceTagInMessage  textArea value", textArea.value)


    this.arrowkeyLocation = -1
    this.tagsCannedFilter = [];
    this.logger.log("[CONVS-DETAIL] replaceTagInMessage  canned text ", canned.text);
    // // prendo val input



    // replace text
    var pos = textArea.value.lastIndexOf("/");
    var strSearch = textArea.value.substr(pos);
    this.logger.log("[CONVS-DETAIL] replaceTagInMessage strSearch ", strSearch);

    var strTEMP = textArea.value.replace(strSearch, canned.text);
    strTEMP = this.replacePlaceholderInCanned(strTEMP);
    // strTEMP = this.replacePlaceholderInCanned(strTEMP);
    // textArea.value = '';
    // that.messageString = strTEMP;
    textArea.value = strTEMP;
    setTimeout(() => {
      textArea.focus();
      this.resizeTextArea();
    }, 200);
  }


  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // this.logger.log("CONVERSATION-DETAIL handleKeyboardEvent  event.key ", event.key);

    if (this.tagsCannedFilter.length > 0) {

      if (event.key === 'ArrowDown') {

        this.arrowkeyLocation++;
        if (this.arrowkeyLocation === this.tagsCannedFilter.length) {
          this.arrowkeyLocation--
        }
        // this.replaceTagInMessage(this.tagsCannedFilter[this.arrowkeyLocation])
      }
      else if (event.key === 'ArrowUp') {

        if (this.arrowkeyLocation > 0) {
          this.arrowkeyLocation--;
        } else if (this.arrowkeyLocation < 0) {
          this.arrowkeyLocation++;
        }
        // this.replaceTagInMessage(this.tagsCannedFilter[this.arrowkeyLocation])
      }

      if (event.key === 'Enter') {
        const canned_selected = this.tagsCannedFilter[this.arrowkeyLocation]

        if (canned_selected) {
          this.replaceTagInMessage(canned_selected)
        }
      }
    }
  }
  // ----------------------------------------------------------
  // ./end CANNED RESPONSES methods
  // ----------------------------------------------------------



  // ----------------------------------------------------------
  // @ Rule of sound message 
  // * if I send it -> NO SOUND
  // * if I'm not in the conversation -> SOUND
  // * if I'm in the conversation at the bottom of the page -> NO SOUND
  // * otherwise -> SOUND
  // ----------------------------------------------------------
  soundMessage() {
    const that = this;
    this.audio = new Audio();
    // this.audio.src = '/assets/sounds/pling.mp3';
    this.audio.src = URL_SOUND_LIST_CONVERSATION;
    this.audio.load();
    this.logger.log('[CONVS-DETAIL] soundMessage conversation this.audio', this.audio);
    clearTimeout(this.setTimeoutSound);
    this.setTimeoutSound = setTimeout(function () {
      that.audio.play().then(() => {
        // Audio is playing.
        this.logger.log('[CONVS-DETAIL] soundMessag that.audio.src ', that.audio.src);
      }).catch(error => {
        that.logger.error(error);
      });
    }, 1000);
  }



  returnOnBeforeMessageRender(event) {
    //this.onBeforeMessageRender.emit(event)
  }

  returnOnAfterMessageRender(event) {
    // this.onAfterMessageRender.emit(event)
  }

  returnOnMenuOption(event: boolean) {
    // this.isMenuShow = event;
  }

  returnOnScrollContent(event: boolean) {

  }

  returnOnAttachmentButtonClicked(event: any) {

  }

  onImageRenderedFN(event) {
    const imageRendered = event;
    if (this.showButtonToBottom) {
      this.scrollBottom(0)
    }
  }

  addUploadingBubbleEvent(event: boolean) {
    this.logger.log('[CONVS-DETAIL] addUploadingBubbleEvent event', event);
    if (event === true) {
      this.scrollBottom(0);
    }
  }

  // -------------- START SCROLL/RESIZE  -------------- //
  /** */
  resizeTextArea() {
    try {
      const elTextArea = this.rowTextArea['el'];
      const that = this;
      setTimeout(() => {
        const textArea = elTextArea.getElementsByTagName('ion-textarea')[0];
        if (textArea) {
          this.logger.log('[CONVS-DETAIL] resizeTextArea textArea ', textArea);
          const txtValue = textArea.value;
          textArea.value = ' ';
          textArea.value = txtValue;
        }
      }, 0);
      setTimeout(() => {
        if (elTextArea) {
          this.logger.log('[CONVS-DETAIL] resizeTextArea elTextArea.offsetHeight ', elTextArea.offsetHeight);
          that.heightMessageTextArea = elTextArea.offsetHeight;
        }
      }, 100);
    } catch (err) {
      this.logger.error('[CONVS-DETAIL] resizeTextArea - error: ', err);
    }
  }

  /**
   * scrollBottom
   * @param time
   */
  private scrollBottom(time: number) {
    this.showIonContent = true;
    if (this.ionContentChatArea) {
      setTimeout(() => {
        this.ionContentChatArea.scrollToBottom(time);
      }, 0);
      // nota: se elimino il settimeout lo scrollToBottom non viene richiamato!!!!!
    }
  }

  /**
   * detectBottom
   */
  async detectBottom() {
    const scrollElement = await this.ionContentChatArea.getScrollElement();

    if (scrollElement.scrollTop < scrollElement.scrollHeight - scrollElement.clientHeight) {
      //NON SONO ALLA FINE --> mostra badge
      this.showButtonToBottom = true;
    } else {
      // SONO ALLA FINE --> non mostrare badge,
      this.showButtonToBottom = false;
    }
  }

  /**
   * Scroll to bottom of page after a short delay.
   * FIREBY BY: click event ScrollToBottom bottom-right icon button
   */
  public actionScrollBottom() {
    this.logger.log('[CONVS-DETAIL] actionScrollBottom - ionContentChatArea: ', this.ionContentChatArea);
    // const that = this;
    this.showButtonToBottom = false;
    this.updateConversationBadge()
    this.NUM_BADGES = 0;
    setTimeout(() => {
      this.ionContentChatArea.scrollToBottom(0);
      // this.conversationsHandlerService.readAllMessages.next(this.conversationWith);
    }, 0);
  }

  /**
   * Scroll to top of the page after a short delay.
   */
  scrollTop() {
    this.logger.log('[CONVS-DETAIL] scrollTop');
    this.ionContentChatArea.scrollToTop(100);
  }

  /** */
  setHeightTextArea() {
    try {
      if (this.rowTextArea) {
        this.heightMessageTextArea = this.rowTextArea['el'].offsetHeight;
        this.logger.log('[CONVS-DETAIL] setHeightTextArea - heightMessageTextArea: ', this.heightMessageTextArea);
      }
    } catch (e) {
      this.logger.error('[CONVS-DETAIL] setHeightTextArea - ERROR ', e)
      this.heightMessageTextArea = '50';
    }
  }


  // -------------------------------------------------------------
  // DRAG FILE 
  // -------------------------------------------------------------
  // DROP (WHEN THE FILE IS RELEASED ON THE DROP ZONE)
  drop(ev: any) {
    ev.preventDefault();
    ev.stopPropagation();

    this.logger.log('[CONVS-DETAIL] ----> FILE - DROP ev ', ev);
    const fileList = ev.dataTransfer.files;
    this.logger.log('[CONVS-DETAIL] ----> FILE - DROP ev.dataTransfer.files ', fileList);
    this.isHovering = false;
    this.logger.log('[CONVS-DETAIL] ----> FILE - DROP isHovering ', this.isHovering);
    if (fileList.length > 0) {
      const file: File = fileList[0];
      this.logger.log('[CONVS-DETAIL] ----> FILE - DROP file ', file);

      var mimeType = fileList[0].type;
      this.logger.log('[CONVS-DETAIL] ----> FILE - DROP mimeType files ', mimeType);

      if (mimeType.startsWith("image")) {

        this.handleDropEvent(ev);

      } else {
        this.logger.log('[CONVS-DETAIL] ----> FILE - DROP mimeType files ', mimeType, 'NOT SUPPORTED FILE TYPE');
        this.presentToastOnlyImageFilesAreAllowedToDrag()
      }
    }
  }

  handleDropEvent(ev) {
    this.logger.log('[CONVS-DETAIL] ----> FILE - HANDLE DROP  EVENT ', ev);
    this.dropEvent = ev
  }

  // DRAG OVER (WHEN HOVER OVER ON THE "DROP ZONE")
  allowDrop(ev: any) {
    ev.preventDefault();
    ev.stopPropagation();
    this.logger.log('[CONVS-DETAIL] ----> FILE - (dragover) allowDrop ev ', ev);
    this.isHovering = true;
    this.logger.log('[CONVS-DETAIL] ----> FILE - (dragover) allowDrop isHovering ', this.isHovering);
  }

  // DRAG LEAVE (WHEN LEAVE FROM THE DROP ZONE)
  drag(ev: any) {
    ev.preventDefault();
    ev.stopPropagation();
    this.logger.log('[CONVS-DETAIL] ----> FILE - (dragleave) drag ev ', ev);
    this.isHovering = false;
    this.logger.log('[CONVS-DETAIL] ----> FILE - FILE - (dragleave) drag his.isHovering ', this.isHovering);
  }

  async presentToastOnlyImageFilesAreAllowedToDrag() {
    const toast = await this.toastController.create({
      message: this.translationMap.get('ONLY_IMAGE_FILES_ARE_ALLOWED_TO_DRAG'),
      duration: 3000,
      color: "danger",
      cssClass: 'toast-custom-class',
    });
    toast.present();
  }


}
// END ALL //