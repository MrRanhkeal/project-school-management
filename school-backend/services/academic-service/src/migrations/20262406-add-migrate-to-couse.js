// 'use strict';

// /** @type {import('sequelize-cli').Migration} */
// module.exports = {
//   async up(queryInterface, Sequelize) {
//     const table = await queryInterface.describeTable('courses');
//     if (table.cost) return; // already there — nothing to do

//     await queryInterface.addColumn('courses', 'cost', {
//       type: Sequelize.DECIMAL(10, 2),
//       allowNull: true,
//       after: 'price',
//     },
//     {
//       type: Sequelize.DECIMAL(10, 2),
//       allowNull: true,
//       after: 'cost',
//     }
//     );
//   },

//   async down(queryInterface) {
//     const table = await queryInterface.describeTable('courses');
//     if (!table.cost) return;

//     await queryInterface.removeColumn('courses', 'cost');
//   },
// };

//migration multiple columns
'use strict';

const TABLE = 'courses';

// Declared once, used by both up() and down().
const COLUMNS = {
    // cost: { type: 'DECIMAL', args: [10, 2], allowNull: true, after: 'price' },
    discount: { type: 'DECIMAL', args: [5, 2], allowNull: true, after: 'price' },
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable(TABLE);

        for (const [name, spec] of Object.entries(COLUMNS)) {
            if (table[name]) continue; // skip what's already there
            await queryInterface.addColumn(TABLE, name, {
                type: Sequelize[spec.type](...spec.args),
                allowNull: spec.allowNull,
                after: spec.after,
            });
        }
    },

    async down(queryInterface) {
        const table = await queryInterface.describeTable(TABLE);

        // Reverse order — `discount` sits AFTER `cost`, so drop it first.
        for (const name of Object.keys(COLUMNS).reverse()) {
            if (!table[name]) continue;
            await queryInterface.removeColumn(TABLE, name);
        }
    },
};

//npm run db:migrate for migrate database