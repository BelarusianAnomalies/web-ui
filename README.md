# Веб-интерфейс
Prod: [сайт](https://fires.oopscommand.com/)

## Что это такое?
Это веб-интерфейс для сайта с тепловыми аномалиями,
использующего API сервиса [MeteoEye][meteoEye]
[УП "Геоинформационные системы"][gis] через промежуточный API сервер для авторизации запросов.

Этот проект является демонстрацией возможностей API MeteoEye, а именно API тепловых аномалий (hotspots).
С его документацией можно ознакомиться по адресу <https://rki.gis.by/api/>

## Скрипты
### Запуск webpack-dev-server
```shell script
yarn start
# или
npm start
```
### Собрать production
```shell script
yarn build
# или
npm run build
```

[meteoEye]:https://meteoeye.gis.by
[gis]:https://www.gis.by
