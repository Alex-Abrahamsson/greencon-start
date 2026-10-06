import styles from "./Route66Progress.module.scss";

const customerCount = 60;
const customerGoal = 100;
const routeLengthMiles = 2448;

const routeStates = [
    { name: "California", miles: 314 },
    { name: "Arizona", miles: 401 },
    { name: "New Mexico", miles: 487 },
    { name: "Texas", miles: 186 },
    { name: "Oklahoma", miles: 432 },
    { name: "Kansas", miles: 13 },
    { name: "Missouri", miles: 317 },
    { name: "Illinois", miles: 301 },
];

const progressCustomers = Math.min(Math.max(customerCount, 0), customerGoal);
const routeProgress = Math.round((progressCustomers / customerGoal) * 100);
const routeDistance = routeStates.reduce((total, state) => total + state.miles, 0);
const traveledMiles = (routeProgress / 100) * routeDistance;
let distanceAtStateStart = 0;
const currentState =
    routeStates.find((state) => {
        distanceAtStateStart += state.miles;
        return traveledMiles < distanceAtStateStart;
    })?.name ?? "Illinois";
const displayedMiles = Math.round((routeProgress / 100) * routeLengthMiles);

export function Route66Progress() {
    return (
        <section className={styles.section} aria-labelledby="route66-title">
            <div className={styles.card}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title} id="route66-title">Route66</h2>
                        <p className={styles.description}>
                            Från Santa Monica på västkusten till Chicago – varje kund tar oss närmare målet.
                        </p>
                    </div>
                    <div className={styles.progressValue} aria-hidden="true">
                        {routeProgress}<span>%</span>
                    </div>
                </div>

                <div
                    className={styles.track}
                    role="progressbar"
                    aria-label="Framsteg mot målet att nå alla önskade kunder"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={routeProgress}
                    aria-valuetext={`${progressCustomers} av ${customerGoal} kunder, ${routeProgress} procent. Ungefär ${displayedMiles} miles från Santa Monica, i ${currentState}.`}
                >
                    <div className={styles.fill} style={{ width: `${routeProgress}%` }}>
                        <span className={styles.marker} aria-hidden="true" />
                    </div>
                </div>

                <div className={styles.endpoints} aria-hidden="true">
                    <span>Santa Monica, Kalifornien</span>
                    <span>Chicago, Illinois</span>
                </div>

                <div className={styles.location}>
                    <span className={styles.customerCount}>
                        {progressCustomers} av {customerGoal} kunder
                    </span>
                    <span className={styles.currentLocation}>
                        Cirka {displayedMiles.toLocaleString("sv-SE")} miles · {currentState}
                    </span>
                </div>
            </div>
        </section>
    );
}
