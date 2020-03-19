import {ConnectableObservable, interval, of, Subject, Subscription, throwError} from 'rxjs';
import * as Rx from 'rxjs-compat';
import {doOnSubscribe} from './observableExt/doOnSubscribe';
import {flatMap, publish} from 'rxjs/operators';
import {log} from './observableExt/tempLogger';
import {lazyConnect} from './observableExt/lazyConnect';
import {retryWithPolicy} from './observableExt/retryWithPolicy';
import {RetryPolicy} from './observableExt';
import {takeUntilInclusive} from './observableExt/takeUntilInclusive';
import {Router} from 'esp-js';
import {liftToEspObservable} from './observableExt/subscribeWithRouter';
import {EspRouterObservable} from './observableExt/subscribeWithRouter';

const doOnSubscribeRx6 = () => {
    // Rx 6
    log(`doOnSubscribeRx6`, true);
    of(1, 2, 3)
        .pipe(
            doOnSubscribe(() => {
                log(`Hello`);
            })
        )
        .subscribe(
            x => {
                log(x);
            }
        );
};
const doOnSubscribeRxCompat = () => {
    log(`doOnSubscribeRxCompat`, true);
    Rx.Observable
        .of(1, 2, 3)
        .doOnSubscribe(() => {
            log(`Hello compat`);
        })
        .subscribe(
            x => {
                log(x);
            }
        );
};
// doOnSubscribeRx6();
// doOnSubscribeRxCompat();

const lazyConnectRx6 = () => {
    log(`lazyConnectRx6`, true);
    const subject = new Subject<number>();
    let  subscription: Subscription = null;
    let obs = subject.pipe(
        doOnSubscribe(() => log(`subscribed`)),
        publish(),
        lazyConnect(s => subscription = s)
    );

    log(`should get lost`);
    subject.next(1); // gets lost

    obs.subscribe(i => {
        log(`s1: ${i}`);
    });

    log(`sub is set: ${subscription !== null}`);

    subject.next(2);

    obs.subscribe(i => {
        log(`s2: ${i}`);
    });

    subject.next(3);

    log(`completing`);
    subscription.unsubscribe();

    log(`should get lost`);
    subject.next(4); // gets lost
};

const lazyConnectRxCompat = () => {
    log(`lazyConnectRxCompat`, true);

    const subject = new Rx.Subject<number>();
    let  subscription: Subscription = null;
    let obs = subject
        .doOnSubscribe(() => log(`subscribed`))
        .publish()
        .lazyConnect(s => subscription = s);

    log(`should get lost`);
    subject.next(1); // gets lost

    obs.subscribe(i => {
        log(`s1: ${i}`);
    });

    log(`sub is set: ${subscription !== null}`);

    subject.next(2);

    obs.subscribe(i => {
        log(`s2: ${i}`);
    });

    subject.next(3);

    log(`completing`);
    subscription.unsubscribe();

    log(`should get lost`);
    subject.next(4); // gets lost
};
// lazyConnectRx6();
// lazyConnectRxCompat();

const retryWithPolicyRx6 = () => {
    log(`retryWithPolicyRx6`, true);
    const xs = interval(1000).pipe(
        publish()
    ) as ConnectableObservable<number>;
    const sub1 = xs.connect();
    const obs = xs.pipe(
        flatMap(i => i % 10 < 5 ? of(i) : throwError(new Error('oops!'))),
        retryWithPolicy(RetryPolicy.createForUnlimitedRetry("Operation Error", 1_000 ))
    );
    obs.subscribe(i => {
        log(`s1: ${i}`);
    });
};
const retryWithPolicyRxCompat = () => {
    log(`retryWithPolicyRxCompat`, true);
    const xs: ConnectableObservable<number> = Rx.Observable.interval(1000).publish();
    const sub1: Subscription = xs.connect();
    const obs = xs
        .flatMap(i => i % 10 < 5 ? of(i) : throwError(new Error('oops!')))
        .retryWithPolicy(RetryPolicy.createForUnlimitedRetry("Operation Error", 1_000 ))
        .subscribe(i => {
            log(`s1: ${i}`);
        });
};
// retryWithPolicyRx6();
// retryWithPolicyRxCompat();

const takeUntilInclusiveRx6 = () => {
    log(`takeUntilInclusiveRx6`, true);
    const xs = interval(1000).pipe(
        takeUntilInclusive(item => item === 3)
    );
    xs.subscribe(
        i => {
            log(`s1: ${i}`);
        },
        e => {},
        () => {
            log(`Completed`);
        }
    );
};
const takeUntilInclusiveRxCompat = () => {
    log(`takeUntilInclusiveRxCompat`, true);
    Rx.Observable
        .interval(1000)
        .takeUntilInclusive(item => item === 3)
        .subscribe(
            i => {
                log(`s1: ${i}`);
            },
            e => {},
            () => {
                log(`Completed`);
            }
        );
};
// takeUntilInclusiveRx6();
// takeUntilInclusiveRxCompat();

const subscribeWithRouterRx6 = () => {
    log(`subscribeWithRouterRx6`, true);
    type MyModel = {
        counter?: number,
        error?: any,
        hasCompleted?: boolean,
        reset: () => void;
        toString: () => void;
    };
    const model: MyModel = {
        counter: 0,
        error: null,
        hasCompleted: false,
        reset() {
            this.counter = 0;
            this.error = null;
            this.hasCompleted = false;
        },
        toString() {
            log(`counter: ${this.counter}, error: ${this.error}, hasCompleted: ${this.hasCompleted}`);
        }
    };
    const router = new Router();
    router.addModel('m1', model);

    const subject = new Subject<number>();

    const stream = subject.pipe(
        flatMap(i => i === 3 ? throwError(new Error('he ded')) : of(i)),
        liftToEspObservable<number, MyModel>(router, 'm1')
    ) as EspRouterObservable<number, MyModel>; // this is a similar pattern to connect(), you need to cast the result of the pipe to get the new observable

    const doSubscribe = () => {
        model.reset();
        return stream.subscribeWithRouter(
            (i: number, m: MyModel) => {
                log(`onNext`);
                m.counter = i;
                m.toString();
            },
            (e: Error, m: MyModel) => {
                log(`onError`);
                m.error = e;
                m.toString();
            },
            (m: MyModel) => {
                log(`onCompleted`);
                m.hasCompleted = true;
                m.toString();
            }
        );
    };

    log(`Example 1`);
    let subscription = doSubscribe();
    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.next(4); // should be missed

    log(`Example 2`);
    subscription = doSubscribe();
    subject.next(1);
    subscription.unsubscribe();
    subject.next(2); // should be missed


    log(`Example 3`);
    subscription = doSubscribe();
    subject.next(1);
    subject.complete();
};
const subscribeWithRouterRxCompat = () => {
    log(`subscribeWithRouterRxCompat`, true);
    type MyModel = {
        counter?: number,
        error?: any,
        hasCompleted?: boolean,
        reset: () => void;
        toString: () => void;
    };
    const model: MyModel = {
        counter: 0,
        error: null,
        hasCompleted: false,
        reset() {
            this.counter = 0;
            this.error = null;
            this.hasCompleted = false;
        },
        toString() {
            log(`counter: ${this.counter}, error: ${this.error}, hasCompleted: ${this.hasCompleted}`);
        }
    };
    const router = new Router();
    router.addModel('m1', model);

    const subject = new Rx.Subject<number>();

    const stream = subject
        .flatMap(i => i === 3 ? Rx.Observable.throwError(new Error('he ded')) : Rx.Observable.of(i))
        .liftToEspObservable<number, MyModel>(router, 'm1');

    const doSubscribe = () => {
        model.reset();
        return stream.subscribeWithRouter(
            (i: number, m: MyModel) => {
                log(`onNext`);
                m.counter = i;
                m.toString();
            },
            (e: Error, m: MyModel) => {
                log(`onError`);
                m.error = e;
                m.toString();
            },
            (m: MyModel) => {
                log(`onCompleted`);
                m.hasCompleted = true;
                m.toString();
            }
        );
    };

    log(`Example 1`);
    let subscription = doSubscribe();
    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.next(4); // should be missed

    log(`Example 2`);
    subscription = doSubscribe();
    subject.next(1);
    subscription.unsubscribe();
    subject.next(2); // should be missed


    log(`Example 3`);
    subscription = doSubscribe();
    subject.next(1);
    subject.complete();
};
// subscribeWithRouterRx6();
subscribeWithRouterRxCompat();

// ------------------------------------------------------------------------------------------------

const publishPlayground = () => {

    const subject = new Subject<number>();
    // const source = interval(1000);
    let obs = subject.pipe(
        doOnSubscribe(() => log(`subscribed`)),
        publish()
    ) as ConnectableObservable<number>;

    subject.next(1); // gets lost

    obs.subscribe(i => {
        log(`s1: ${i}`);
    });

    log(`connecting`)
    let subscription = obs.connect();
    subject.next(2);

    obs.subscribe(i => {
        log(`s2: ${i}`);
    });
    subject.next(3);

    log(`completing`)
    subscription.unsubscribe();
};

// publishPlayground();