// Тестовые данные моделей (будут загружены в БД при первом запуске)
const MODELS_DATA = [
    {
        id: 1,
        name: 'Ксения',
        age: 26,
        city: 'Москва',
        description: 'Красивая Фея исполнит ваши желания',
        photo: 'https://www.amasonka.de/images/escortdienst.jpg',
        rating: 4.9,
        height: 178,
        weight: 62,
        bust: '90C',
        ethnicity: 'Латиноамериканка',
        build: 'Спортивное',
        hair_color: 'Шатен',
        services: [
            'римминг', 'тройничок мжм', 'бдсм', 'золотой дождь',
            'ролевые игры', 'минет окончанием', 'минет без резинки',
            'массаж', 'анальный секс'
        ],
        tariffs: { 1: 7000, 2: 9800, 3: 14700 }
    },
    {
        id: 2,
        name: 'Елена',
        age: 25,
        city: 'Москва',
        description: 'Стройная брюнетка, спортивная.',
        photo: 'https://sweet-girls-escort.ru/wp-content/uploads/2025/03/Yarina-foto-1.jpg',
        rating: 4.7,
        height: 170,
        weight: 58,
        bust: '85B',
        ethnicity: 'Славянка',
        build: 'Стройное',
        hair_color: 'Брюнетка',
        services: ['классический массаж', 'эротический массаж', 'минет'],
        tariffs: { 1: 6000, 2: 10800, 3: 16200 }
    },
    {
        id: 3,
        name: 'Светлана',
        age: 27,
        city: 'Москва',
        description: 'Рыжая бестия, отличное чувство юмора.',
        photo: 'https://lux-model-agency.ru/wp-content/uploads/2025/01/Priya-foto-1.jpg',
        rating: 4.8,
        height: 165,
        weight: 55,
        bust: '88C',
        ethnicity: 'Славянка',
        build: 'Худощавое',
        hair_color: 'Рыжий',
        services: ['бдсм', 'ролевые игры', 'фетиш'],
        tariffs: { 1: 5500, 2: 9900, 3: 14850 }
    },
    {
        id: 4,
        name: 'Екатерина',
        age: 22,
        city: 'Москва',
        description: 'Огненная блондинка',
        photo: 'https://elit-moskva.ru/uploads/renesmee-escort-in-moscow-cover-5.webp',
        rating: 4.8,
        height: 163,
        weight: 52,
        bust: '88C',
        ethnicity: 'Славянка',
        build: 'Худощавое',
        hair_color: 'Блонд',
        services: ['бдсм', 'ролевые игры', 'фетиш'],
        tariffs: { 1: 5500, 2: 9900, 3: 14850 }
    },
    {
        id: 5,
        name: 'Алена',
        age: 29,
        city: 'Москва',
        description: 'Опытная',
        photo: 'https://elite-girls-astana.com/wp-content/uploads/2025/03/Klavdiya-1.jpg',
        rating: 4.8,
        height: 169,
        weight: 62,
        bust: '88C',
        ethnicity: 'Славянка',
        build: 'Спортивное',
        hair_color: 'Брюнетка',
        services: ['бдсм', 'ролевые игры', 'фетиш'],
        tariffs: { 1: 5500, 2: 9900, 3: 14850 }
    }
];

module.exports = MODELS_DATA;