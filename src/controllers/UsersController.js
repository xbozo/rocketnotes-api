const { hash, compare } = require('bcryptjs')
const AppError = require('../utils/AppError')
const sqliteConnection = require('../database/sqlite')

class UsersController {
	async searchUnique(req, res) {
		const { id } = req.params

		const database = await sqliteConnection()
		const user = await database.get('SELECT * FROM users WHERE id = (?)', [id])

		if (!user) throw new AppError('Usuário não encontrado.')

		res.status(200).json({
			id: user.id,
			name: user.name,
			email: user.email,
		})
	}

	async create(req, res) {
		const { name, email, password } = req.body

		const database = await sqliteConnection()
		const checkIfUserExists = await database.get(`SELECT * FROM USERS WHERE email = (?)`, [email])
		// ao invés da interpolação com ${}^, o (?) e o [email] indicam a posição-valor. em casos de mais de um, a ordem deles será respeitada

		if (checkIfUserExists) throw new AppError('This email is already in use.')

		const hashedPassword = await hash(password, 8) // 8 = grau de complexidade
		await database.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [
			name,
			email,
			hashedPassword,
		])

		res.status(201).json()
	}

	async update(request, response) {
		const { name, email, new_password, old_password } = request.body
		const { id } = request.params

		const database = await sqliteConnection()
		const user = await database.get('SELECT * FROM users WHERE id = (?)', [id])

		if (!user) throw new AppError('Usuário não encontrado.')

		const userWithUpdatedEmail = await database.get('SELECT * FROM users WHERE email = (?)', [
			email,
		])

		if (userWithUpdatedEmail && userWithUpdatedEmail.id !== user.id) {
			throw new AppError('Este e-mail já está em uso.')
		}

		user.name = name ?? user.name
		user.email = email ?? user.email

		if (new_password && !old_password) throw new AppError('Informe a senha atual.')

		if (new_password && old_password) {
			const checkOldPassword = await compare(old_password, user.password)

			if (!checkOldPassword) throw new AppError('Senha atual incorreta.')

			user.password = await hash(new_password, 8)
		}

		await database.run(
			`
		 UPDATE users SET
			name = ?,
			email = ?,
			password = ?,
			updated_at = DATETIME('now')
		 WHERE id = ?`,
			[user.name, user.email, user.password, id]
		)

		return response.json()
	}
}

module.exports = UsersController