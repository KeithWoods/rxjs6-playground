import {pipe, Observable, of, Subject, ConnectableObservable, Subscription, interval, throwError} from 'rxjs';
import {doOnSubscribe} from "./observableExt/doOnSubscribe";
import {flatMap, multicast, publish, refCount, share, tap} from "rxjs/operators";
import {log} from "./observableExt/tempLogger";
import {lazyConnect} from "./observableExt/lazyConnect";
import {retryWithPolicy} from "./observableExt/retryWithPolicy";
import {RetryPolicy} from "./observableExt";

const doOnSubscribeRunner = () => {
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


const lazyConnectRunner = () => {

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

const retryWithPolicyRunner = () => {
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

retryWithPolicyRunner();