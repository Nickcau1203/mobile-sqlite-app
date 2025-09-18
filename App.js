// App.js - Party RPG com SQLite
import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from '@react-native-async-storage/async-storage';

let openDatabase = null;
let db = null;
if (Platform.OS !== 'web') {
  openDatabase = require('expo-sqlite').openDatabase;
  db = openDatabase("party.db");
}

export default function App() {
  // Estados - variáveis que mudam
  const [characters, setCharacters] = useState([]);
  const [newCharacter, setNewCharacter] = useState("");

  // Criar tabela e carregar dados quando app iniciar
  useEffect(() => {
    if (Platform.OS === 'web') {
      loadCharactersWeb();
    } else {
      db.transaction(tx => {
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            recruited INTEGER
          );`
        );
        // Verificar se há dados
        tx.executeSql(
          "SELECT COUNT(*) as count FROM characters",
          [],
          (_, { rows }) => {
            if (rows._array[0].count === 0) {
              // Inserir personagens iniciais em transações separadas
              db.transaction(tx2 => {
                tx2.executeSql("INSERT INTO characters (name, recruited) VALUES (?, ?)", ["🧙‍♂️ Gandalf o Mago", 0]);
                tx2.executeSql("INSERT INTO characters (name, recruited) VALUES (?, ?)", ["⚔️ Aragorn o Guerreiro", 1]);
                tx2.executeSql("INSERT INTO characters (name, recruited) VALUES (?, ?)", ["🏹 Legolas o Arqueiro", 0],
                  () => {
                    loadCharacters();
                  }
                );
              });
            } else {
              loadCharacters();
            }
          },
          (_, error) => { console.error('Erro ao contar personagens:', error); return false; }
        );
      }, (error) => {
        console.error("Erro ao inicializar banco:", error);
      });
    }
  }, []);

  // Funções para web (AsyncStorage)
  async function loadCharactersWeb() {
    try {
      const data = await AsyncStorage.getItem('characters');
      if (data) {
        setCharacters(JSON.parse(data));
      } else {
        // Se não houver dados, cria personagens iniciais
        const initial = [
          { id: 1, name: '🩷 Barbie', recruited: 0 },
          { id: 2, name: '💙 Ken', recruited: 1 },
          { id: 3, name: '👠 Raquelle', recruited: 0 },
          { id: 4, name: '🛹 Skipper', recruited: 0 },
          { id: 5, name: '🤳🏻 Stacie', recruited: 0 },
          { id: 6, name: '🦄 Chelsea', recruited: 0 },
          { id: 7, name: '🎤 Teresa', recruited: 0 },
          { id: 8, name: '🚗 Midge', recruited: 0 },
          { id: 9, name: '🎻 Ryan', recruited: 0 },
          { id: 10, name: '👗 Nikki', recruited: 0 },
        ];
        setCharacters(initial);
        await AsyncStorage.setItem('characters', JSON.stringify(initial));
      }
    } catch (e) {
      console.error('Erro ao carregar personagens (web):', e);
    }
  }

  async function addCharacterWeb() {
    if (newCharacter === '') return;
    const newId = Date.now();
    const updated = [...characters, { id: newId, name: newCharacter, recruited: 0 }];
    setCharacters(updated);
    await AsyncStorage.setItem('characters', JSON.stringify(updated));
    setNewCharacter('');
  }

  async function toggleRecruitWeb(character) {
    const updated = characters.map(c => c.id === character.id ? { ...c, recruited: c.recruited ? 0 : 1 } : c);
    setCharacters(updated);
    await AsyncStorage.setItem('characters', JSON.stringify(updated));
  }

  async function removeCharacterWeb(character) {
    const updated = characters.filter(c => c.id !== character.id);
    setCharacters(updated);
    await AsyncStorage.setItem('characters', JSON.stringify(updated));
  }

  // Carregar personagens do banco
  function loadCharacters() {
    db.transaction(tx => {
      tx.executeSql(
        "SELECT * FROM characters ORDER BY id DESC",
        [],
        (_, { rows }) => {
          console.log('Personagens carregados:', rows._array);
          setCharacters(rows._array);
        },
        (_, error) => { console.error("Erro ao carregar personagens:", error); return false; }
      );
    });
  }

  // Adicionar novo personagem à party
  function addCharacter() {
    if (newCharacter === "") return;
    db.transaction(tx => {
      tx.executeSql(
        "INSERT INTO characters (name, recruited) VALUES (?, ?)",
        [newCharacter, 0],
        () => {
          loadCharacters();
          setNewCharacter("");
        },
        (_, error) => { console.error("Erro ao adicionar o nome:", error); return false; }
      );
    });
  }

  // Recrutar/dispensar personagem
  function toggleRecruit(character) {
    const newStatus = character.recruited ? 0 : 1;
    db.transaction(tx => {
      tx.executeSql(
        "UPDATE characters SET recruited = ? WHERE id = ?",
        [newStatus, character.id],
        () => loadCharacters(),
        (_, error) => { console.error("Erro ao atualizar status:", error); return false; }
      );
    });
  }

  // Remover personagem da party
  function removeCharacter(character) {
    Alert.alert("Remover Personagem", `Remover "${character.name}" da party?`, [
      { text: "Não" },
      {
        text: "Sim",
        onPress: () => {
          db.transaction(tx => {
            tx.executeSql(
              "DELETE FROM characters WHERE id = ?",
              [character.id],
              () => loadCharacters(),
              (_, error) => { console.error("Erro ao remover seu nome:", error); return false; }
            );
          });
        }
      }
    ]);
  }

  // Substituir funções pelos métodos web se for web
  const addCharacterFn = Platform.OS === 'web' ? addCharacterWeb : addCharacter;
  const toggleRecruitFn = Platform.OS === 'web' ? toggleRecruitWeb : toggleRecruit;
  const removeCharacterFn = Platform.OS === 'web' ? removeCharacterWeb : removeCharacter;

  // Como mostrar cada personagem
  function renderCharacter({ item }) {
    return (
      <TouchableOpacity
        style={[styles.character, item.recruited && styles.characterRecruited]}
        onPress={() => toggleRecruitFn(item)}
        onLongPress={() => removeCharacterFn(item)}
      >
        <Text style={[styles.characterText, item.recruited && styles.characterRecruitedText]}>
          {item.name}
        </Text>
        <Text style={styles.status}>
          {item.recruited ? "⭐" : "❌"}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {/* Título */}
      <Text style={styles.title}> 💕 Personagens para a festa da Barbie</Text>
      <Text style={styles.subtitle}>⭐ Convidado - ❌ Não convidado</Text>

      {/* Adicionar novo personagem */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Coloque o seu nome..."
          value={newCharacter}
          onChangeText={setNewCharacter}
          onSubmitEditing={addCharacterFn}
        />
        <TouchableOpacity style={styles.button} onPress={addCharacterFn}>
          <Text style={styles.buttonText}>•</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de personagens */}
      <FlatList
        data={characters}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => renderCharacter({ item })}
        style={styles.list}
        ListEmptyComponent={<Text style={{color:'#fff',textAlign:'center',marginTop:40}}>Nenhum personagem encontrado.</Text>}
      />
    </SafeAreaView>
  );
}

// Estilos simples
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsla(320, 100%, 78%, 1.00)", 
    paddingTop: 50, 
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "hsla(0, 0%, 0%, 1.00)", 
  },
  subtitle: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 20,
    color: "rgba(255, 255, 255, 1)", 
  },
  inputRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: "rgba(255, 0, 98, 1)", 
    borderRadius: 8,
    padding: 12,
    backgroundColor: "hsla(0, 0%, 100%, 1.00)", 
    color: "hsla(0, 0%, 0%, 1.00)",
    fontSize: 16,
  },
  button: {
    backgroundColor: "rgba(245, 245, 245, 1)", 
    padding: 12,
    borderRadius: 8,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
    width: 50,
    borderWidth: 2,
    borderColor: "rgba(255, 0, 98, 1)", 
  },
  buttonText: {
    color: "hsla(0, 72%, 45%, 1.00)", 
    fontSize: 18,
    fontWeight: "bold",
  },
  list: {
    flex: 1,
  },
  character: {
    backgroundColor: "hsla(0, 0%, 0%, 1.00)", 
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 0, 98, 1)", 
  },
  characterRecruited: {
    backgroundColor: "hsla(0, 0%, 100%, 1.00)", 
    borderColor: "rgba(255, 0, 98, 1)", 
    borderWidth: 2,
  },
  characterText: {
    flex: 1,
    fontSize: 16,
    color: "hsla(325, 100%, 84%, 1.00)", 
    fontWeight: "500",
  },
  characterRecruitedText: {
    color: "rgba(255, 0, 98, 1)", 
    fontWeight: "bold",
  },
  status: {
    fontSize: 20,
    marginLeft: 10,
  },
});
