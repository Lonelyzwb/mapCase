'use strict';
class Workout {
  constructor(coords, distance, duration, date, id) {
    this.coords = coords;
    this.distance = distance; // km
    this.duration = duration; // min
    this.date = date;
    this.id = id;
  }

  _setDescription() {
    this.description = `${this.date.getMonth()}月/${this.date.getDay()}日 ${
      this.type === 'running' ? '慢跑' : '爬山'
    }`;
    return this.description;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(
    coords,
    distance,
    duration,
    cadence,
    date = new Date(),
    id = String(Date.now()).slice(-10)
  ) {
    super(coords, distance, duration, date, id);
    this.cadence = cadence;
    this._calPace();
    this._setDescription();
  }

  _calPace() {
    //  min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(
    coords,
    distance,
    duration,
    elevation,
    date = new Date(),
    id = String(Date.now()).slice(-10)
  ) {
    super(coords, distance, duration, date, id);
    this.elevation = elevation;
    this._calSpeed();
    this._setDescription();
  }

  _calSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const running = new Running([100, 100], 10, 100, 100);
// prettier-ignore
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

////////////////////////////
//APPLICATION ARCHITECTURE

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;

  constructor() {
    this._getLocation();

    //事件处理
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleField);
    containerWorkouts.addEventListener(
      'click',
      this._moveToPosition.bind(this)
    );
  }

  _getLocation() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._renderMap.bind(this),
        function () {
          alert('当前获取不到位置');
        }
      );
  }

  _renderMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    console.log(coords);
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    //给当前map添加点击处理事件
    this.#map.on('click', this._renderForm.bind(this));

    L.tileLayer(
      // 'http://wprd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}',
      'http://gac-geo.googlecnapps.cn/maps/vt?lyrs=m&x={x}&y={y}&z={z}',
      {
        attribution:
          '&copy; <a href="http://www.google.com/maps/vt">Google地图（火星坐标）</a> contributors',
      }
    ).addTo(this.#map);

    L.marker(coords)
      .addTo(this.#map)
      .bindPopup(`💕 当前位置`, {
        maxWidth: 300,
        minWidth: 100,
        closeOnClick: false,
        autoClose: false,
      })
      .openPopup();

    //获取本地data
    this._getLocalStorage();

    //重新定位到自身
    this.#map.setView(coords, this.#mapZoomLevel);
  }

  _renderForm(mapE) {
    this.#mapEvent = mapE.latlng;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    const positiveInputs = (...inputs) => inputs.every(input => input > 0);
    //  1） 校验表单数据
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    //  2） 生成type生成相应的workout
    const type = inputType.value;
    const { lat, lng } = this.#mapEvent;
    let workout;
    //生成 running
    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (!validInputs(distance, duration, cadence))
        return alert('距离、时间和步伐必须为数字');
      if (!positiveInputs(distance, duration, cadence))
        return alert('距离、时间和步伐必须为正值');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //生成 cycling
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (!validInputs(distance, duration, elevation))
        return alert('距离、时间和海拔必须为数字');
      if (!positiveInputs(distance, duration))
        return alert('距离、时间必须为正值');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //  3） render 这个workout 地图 marker
    this._renderWorkoutMarker(workout);
    //  4） render 这个workout 在 list
    this._renderWorkout(workout);
    //  5） 表单消失并且表单inputs的数据清空
    this._hideForm();
    //  6） 将当前  这个workout 加入 workouts
    this.#workouts.push(workout);

    //  7）把当前workouts 放进本地
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}： ${workout.description}`,
        {
          maxWidth: 300,
          minWidth: 100,
          closeOnClick: false,
          autoClose: false,
          className: `${workout.type}-popup`,
        }
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
                    <h2 class="workout__title">${workout.description}</h2>
                    <div class="workout__details">
                      <span class="workout__icon">${
                        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
                      }</span>
                      <span class="workout__value">${workout.distance}</span>
                      <span class="workout__unit">km</span>
                    </div>
                    <div class="workout__details">
                      <span class="workout__icon">⏱</span>
                      <span class="workout__value">${workout.duration}</span>
                      <span class="workout__unit">min</span>
                    </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
                      <span class="workout__icon">⚡️</span>
                      <span class="workout__value">${workout.pace.toFixed(
                        1
                      )}</span>
                      <span class="workout__unit">min/km</span>
                    </div>
                    <div class="workout__details">
                      <span class="workout__icon">🦶🏼</span>
                      <span class="workout__value">${workout.cadence}</span>
                      <span class="workout__unit">spm</span>
                    </div>
                  </li>`;
    }

    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(
                      1
                    )}</span>
                    <span class="workout__unit">km/h</span>
                  </div>
                  <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevation}</span>
                    <span class="workout__unit">m</span>
                  </div>
                </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _toggleField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _moveToPosition(e) {
    const workoutItem = e.target.closest('.workout');
    if (!workoutItem) return;

    const workout = this.#workouts.find(
      workout => workout.id === workoutItem.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
        easeLinearity: 0.3,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    data.forEach(workout => {
      if (workout.type === 'running') {
        //prettier-ignore
        this.#workouts.push(new Running(workout.coords,workout.distance,workout.duration, workout.cadence,new Date(workout.date),workout.id));
      }

      if (workout.type === 'cycling') {
        //prettier-ignore
        this.#workouts.push(new Cycling(workout.coords,workout.distance,workout.duration,workout.elevation,new Date(workout.date),workout.id));
      }
    });

    console.log(this.#workouts);
    this.#workouts.forEach(workout => {
      //render marker on the map
      this._renderWorkoutMarker(workout);
      //render workout on the list
      this._renderWorkout(workout);
    });
  }
}

const app = new App();
