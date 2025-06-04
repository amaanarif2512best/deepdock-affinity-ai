
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Play, Settings, Database, Brain, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  prepareLigandPDBQT, 
  prepareReceptorPDBQT, 
  predictWithDeepDTA, 
  predictWithGraphDTA,
  analyzeMolecularInteractions,
  type DeepLearningPrediction,
  type DockingResult,
  type InteractionDetails
} from "@/utils/dockingUtils";

interface DockingPredictionEngineProps {
  ligandSmiles: string;
  receptorType: string;
  customFasta?: string;
  customPdbData?: string;
  onPredictionComplete: (result: any) => void;
}

const DockingPredictionEngine: React.FC<DockingPredictionEngineProps> = ({
  ligandSmiles,
  receptorType,
  customFasta,
  customPdbData,
  onPredictionComplete
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [selectedModel, setSelectedModel] = useState('DeepDTA');
  const [preparationStatus, setPreparationStatus] = useState<{
    ligandPrepared: boolean;
    receptorPrepared: boolean;
    ligandPdbqt?: string;
    receptorPdbqt?: string;
  }>({ ligandPrepared: false, receptorPrepared: false });
  const [predictionResults, setPredictionResults] = useState<DeepLearningPrediction | null>(null);
  const [interactionAnalysis, setInteractionAnalysis] = useState<InteractionDetails[]>([]);

  const handleDockingPrediction = async () => {
    if (!ligandSmiles || (!receptorType && !customFasta && !customPdbData)) {
      toast({
        title: "Missing Input",
        description: "Please provide both ligand and receptor information.",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setProgress(0);

    try {
      // Step 1: Prepare Ligand PDBQT
      setCurrentStep('Preparing ligand with AutoDockTools...');
      setProgress(20);
      
      const ligandPdbqt = await prepareLigandPDBQT(ligandSmiles);
      setPreparationStatus(prev => ({ ...prev, ligandPrepared: true, ligandPdbqt }));
      
      // Step 2: Prepare Receptor PDBQT
      setCurrentStep('Preparing receptor structure...');
      setProgress(40);
      
      const receptorPdb = customPdbData || generateReceptorPDB();
      const receptorPdbqt = await prepareReceptorPDBQT(receptorPdb, customFasta);
      setPreparationStatus(prev => ({ ...prev, receptorPrepared: true, receptorPdbqt }));
      
      // Step 3: Deep Learning Prediction
      setCurrentStep(`Running ${selectedModel} prediction...`);
      setProgress(60);
      
      const proteinSequence = customFasta ? extractSequenceFromFasta(customFasta) : getReceptorSequence(receptorType);
      
      let prediction: DeepLearningPrediction;
      if (selectedModel === 'DeepDTA') {
        prediction = await predictWithDeepDTA(ligandSmiles, proteinSequence);
      } else {
        prediction = await predictWithGraphDTA(ligandSmiles, proteinSequence);
      }
      
      setPredictionResults(prediction);
      
      // Step 4: Molecular Interaction Analysis
      setCurrentStep('Analyzing molecular interactions...');
      setProgress(80);
      
      const interactions = analyzeMolecularInteractions(ligandPdbqt, receptorPdbqt);
      setInteractionAnalysis(interactions);
      
      // Step 5: Complete
      setCurrentStep('Docking analysis complete!');
      setProgress(100);
      
      // Generate final results
      const finalResults = {
        bindingAffinity: prediction.affinityScore,
        confidence: prediction.confidence,
        modelUsed: prediction.modelUsed,
        interactions: interactions,
        ligandPdbqt,
        receptorPdbqt,
        preparation: preparationStatus
      };
      
      onPredictionComplete(finalResults);
      
      toast({
        title: "Docking Complete",
        description: `${selectedModel} prediction: ${prediction.affinityScore.toFixed(2)} pKd (${prediction.confidence}% confidence)`,
      });
      
    } catch (error) {
      console.error('Docking prediction error:', error);
      toast({
        title: "Prediction Failed",
        description: "An error occurred during docking analysis.",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const generateReceptorPDB = (): string => {
    // Generate basic PDB structure for known receptors
    return `HEADER    PROTEIN RECEPTOR
ATOM      1  N   ALA A   1      20.154  16.967  18.849  1.00 20.00           N
ATOM      2  CA  ALA A   1      21.618  17.134  18.669  1.00 20.00           C
ATOM      3  C   ALA A   1      22.354  15.816  18.397  1.00 20.00           C
ATOM      4  O   ALA A   1      21.807  14.734  18.173  1.00 20.00           O
END`;
  };

  const extractSequenceFromFasta = (fasta: string): string => {
    return fasta.replace(/^>.*\n/, '').replace(/\n/g, '');
  };

  const getReceptorSequence = (receptor: string): string => {
    const sequences = {
      'il-6': 'MNSFSTSAFGPVAFSLGLLLVLPAAFPAPVPPGEDSKDVAAPHRQPLTSSERIDKQIRYILDGISALRKETCNKSNMCESSKEALAENNLNLPKMAEKDGCFQSGFNEETCLVKIITGLLEFEVYLEYLQNRFESSEEQARAVQMSTKVLIQFLQKKAKNLDAITTPDPTTNASLLTKLQAQNQWLQDMTTHLILRSFKEFLQSSLRALRQM',
      'il-10': 'MHSSALLCCLVLLTGVRASPGQGTQSENSCTHFPGNLPNMLRDLRDAFSRVKTFFQMKDQLDNLLLKESLLEDFKGYLGCQALSEMIQFYLEEVMPQAENQDPDIKAHVNSLGENLKTLRLRLRRCHRFLPCENKSKAVEQVKNAFNKLQEKGIYKAMSEFDIFINYIEAYMTMKIRN',
      'il-17a': 'MTILYATFMKFVPPALAVLLHGFIPPATPDPTNFSGSLLFVPTFQLCNTNLHSAGFTLNVDSSHLYNHFQPLFTVPDIVHQQLRDQYGDFEAMEKSTQALLLVDDFMEELQHLAQIAHELVVVHAMGFKAATLNPFDLRYAHGDAATQRLQQGVEHEMQTLDHLLQLPAHQAHLPDQGLRELQGLRGLQETGAAVDLLGELHELMERLQAMAQLHAEHIVDQGGIKPLDKQTQFEENPTV',
      'tnf-alpha': 'MSTESMIRDVELAEEALPKKTGGPQGSRRCLFLSLFSFLIVAGATTLFCLLHFGVIGPQREEFPRDLSLISPLAQAVRSSSRTPSDKPVAHVVANPQAEGQLQWLNRRANALLANGVELRDNQLVVPSEGLYLIYSQVLFKGQGCPSTHVLLTHTISRIAVSYQTKVNLLSAIKSPCQRETPEGAEAKPWYEPIYLGGVFQLEKGDRLSAEINRPDYLDFAESGQVYFGIIAL'
    };
    
    return sequences[receptor as keyof typeof sequences] || sequences['il-6'];
  };

  const downloadPDBQT = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-blue-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Brain className="h-5 w-5" />
          Advanced Docking Prediction Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        
        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Deep Learning Model</label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger>
              <SelectValue placeholder="Select prediction model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DeepDTA">
                <div className="flex flex-col">
                  <span className="font-medium">DeepDTA</span>
                  <span className="text-xs text-gray-500">Convolutional Neural Network for Drug-Target Affinity</span>
                </div>
              </SelectItem>
              <SelectItem value="GraphDTA">
                <div className="flex flex-col">
                  <span className="font-medium">GraphDTA</span>
                  <span className="text-xs text-gray-500">Graph Neural Network for Enhanced Predictions</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Preparation Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Ligand Preparation</h4>
                <p className="text-sm text-gray-500">AutoDockTools + Open Babel</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={preparationStatus.ligandPrepared ? "default" : "secondary"}>
                  {preparationStatus.ligandPrepared ? "Ready" : "Pending"}
                </Badge>
                {preparationStatus.ligandPdbqt && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => downloadPDBQT(preparationStatus.ligandPdbqt!, 'ligand.pdbqt')}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Receptor Preparation</h4>
                <p className="text-sm text-gray-500">PDB Processing + PDBQT</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={preparationStatus.receptorPrepared ? "default" : "secondary"}>
                  {preparationStatus.receptorPrepared ? "Ready" : "Pending"}
                </Badge>
                {preparationStatus.receptorPdbqt && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => downloadPDBQT(preparationStatus.receptorPdbqt!, 'receptor.pdbqt')}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Run Prediction */}
        <div className="text-center">
          <Button 
            onClick={handleDockingPrediction}
            disabled={isRunning || !ligandSmiles || (!receptorType && !customFasta && !customPdbData)}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? "Running Docking Analysis..." : "Start Docking Prediction"}
          </Button>
          
          {isRunning && (
            <div className="mt-4 space-y-2">
              <Progress value={progress} className="w-full max-w-md mx-auto" />
              <p className="text-sm text-gray-600">{currentStep}</p>
            </div>
          )}
        </div>

        {/* Results Display */}
        {predictionResults && (
          <div className="mt-6 space-y-4">
            <Separator />
            <h3 className="text-lg font-semibold">Prediction Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 text-center">
                <h4 className="font-medium">Binding Affinity</h4>
                <div className="text-2xl font-bold text-blue-600 mt-2">
                  {predictionResults.affinityScore.toFixed(2)} pKd
                </div>
                <p className="text-sm text-gray-500">Deep Learning Prediction</p>
              </Card>
              
              <Card className="p-4 text-center">
                <h4 className="font-medium">Model Confidence</h4>
                <div className="text-2xl font-bold text-green-600 mt-2">
                  {predictionResults.confidence}%
                </div>
                <p className="text-sm text-gray-500">{predictionResults.modelUsed}</p>
              </Card>
              
              <Card className="p-4 text-center">
                <h4 className="font-medium">Interactions Found</h4>
                <div className="text-2xl font-bold text-purple-600 mt-2">
                  {interactionAnalysis.length}
                </div>
                <p className="text-sm text-gray-500">Key Binding Sites</p>
              </Card>
            </div>

            {/* Interaction Analysis */}
            {interactionAnalysis.length > 0 && (
              <Card className="p-4">
                <h4 className="font-medium mb-3">Molecular Interactions</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {interactionAnalysis.map((interaction, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {interaction.type.replace('_', ' ')}
                        </Badge>
                        <span>{interaction.ligandAtom} ↔ {interaction.proteinResidue}</span>
                      </div>
                      <div className="text-right">
                        <div>{interaction.distance}Å</div>
                        <div className="text-xs text-gray-500">
                          Strength: {(interaction.strength * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DockingPredictionEngine;
