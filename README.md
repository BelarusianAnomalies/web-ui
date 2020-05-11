# Веб-интерфейс
Prod: [сайт](https://fires.oopscommand.com/)

## Что это такое?
Это веб-интерфейс для сайта с тепловыми аномалиями,
использующий API сервиса [MeteoEye][meteoEye]
[УП "Геоинформационные системы"][gis].

Этот сайт является демонстрацией возможностей API MeteoEye, а именно API тепловых аномалий (hotspots).
С его документацией API можно ознакомиться по адресу <https://rki.gis.by/api/>

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
