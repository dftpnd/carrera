const _ = require('lodash');
const redux = require('redux');
const { createStore } = redux;

const getDelta = (a, b) => {
    console.log('getDelta ', a - b);
    return a - b;
}

const compareDelta = (a, b)=> {
    const delta = Math.abs(getDelta(a, b));
    const step = 10;
    
    if(delta > step){
        return true;
    }

    return false;
}

function positiveValue(value){
    return Math.round( value * 50 ) + 50;
}

function getSpeed(distance, time){
    if(!distance || !time){
        return 0;
    }

    return Math.round(Math.abs(distance / time * 10));
}

function haveStep(a , b){
    const delta = a - b;

    if(Math.abs(delta) >= 10){
        return true;
    }

    return false;
}

function loger(state = { 
        valueMotor: 0,
        valueX: 0,
        speedX: 0,
        timeX: Date.now(),
        valueY: 0,
        speedY: 0,
        timeY: Date.now(),
    }, { type, value }) {
    switch (type) {
        case 'ROTATION_X':
            const valueX = Math.round(value * 80);
            const timeX = Date.now();
            const deltaX =  state.valueX - valueX;

            if(!haveStep(state.valueX, valueX)){
                return state;
            }

            return { 
                    ...state,
                    valueX,
                    timeX,
                    speedX: getSpeed(deltaX, timeX - state.timeX)
                };
        case 'SET_POWER':
            const timeY = Date.now();
            const valueMotor = Math.round( value * 100 );
            const deltaMotor =  state.valueMotor - valueMotor;

            if(!haveStep(state.valueMotor, valueMotor)){
                return state;
            }

            return { 
                ...state,
                valueMotor,
                timeY,
                speedY: getSpeed(deltaMotor, timeY - state.timeY)
            };
      default:
        return state
    }
}

let store = createStore(loger);

///////////////////////////////////////////

var gamepad = require('gamepad');

gamepad.init();

setInterval(gamepad.processEvents, 16);


const onGamepad = (id, axis, value) => {
    const SERVA = 2;
    const MOTOR_POWER = 1;


    if(axis === SERVA ){
        store.dispatch({ type: 'ROTATION_X',  value });
    }

    if(axis === MOTOR_POWER ){
        store.dispatch({ type: 'SET_POWER',  value });
    }
};

gamepad.on('move', onGamepad);

///////////////////////////////////////////

var PoweredUP = require('node-poweredup');
const poweredUP = new PoweredUP.PoweredUP();

poweredUP.on('discover', async (hub) => {
    console.log(`Discovered ${hub.name}!`);
    await hub.connect();

    const motorA = await hub.waitForDeviceAtPort('A');
    const motorB = await hub.waitForDeviceAtPort('B');
    const motorC = await hub.waitForDeviceAtPort('C');
    const lightD = await hub.waitForDeviceAtPort('D');
    
    

    let isBusyMotor = false;
    let lastRotation = 0;
    
    // motorC.gotoAngle(0, 10)
    // motorC.gotoRealZero(10)
    // motorC.resetZero(10)

    lightD.setBrightness(100);

    
    store.subscribe( () => {
        const { valueX } = store.getState();

        if(lastRotation === valueX){
            return;
        }

        lastRotation = valueX;

        console.log('start valueX', valueX);

        motorC.gotoAngle(valueX, 50);
    });

   store.subscribe( async () => {
        const { valueMotor } = store.getState();

        if(!isBusyMotor){
            isBusyMotor = true;

            await motorA.setPower(valueMotor);
            await motorB.setPower(valueMotor);
        
            isBusyMotor = false;
        }
    });
    
});

console.log('poweredUP.scan...');
poweredUP.scan();


